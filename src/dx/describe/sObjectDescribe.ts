/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CliCommandExecutor,
  //CommandOutput,
  CommandBuilder
} from '../cli';
import * as vscode from 'vscode';
import { xhr, XHROptions, XHRResponse } from 'request-light';
import { CLIENT_ID } from '../constants';
import constants from './../../models/constants';

export interface SObject {
  actionOverrides: any[];
  activateable: boolean;
  childRelationships: ChildRelationship[];
  compactLayoutable: boolean;
  createable: boolean;
  custom: boolean;
  customSetting: boolean;
  deletable: boolean;
  deprecatedAndHidden: boolean;
  feedEnabled: boolean;
  fields: Field[];
  hasSubtypes: boolean;
  isSubtype: boolean;
  keyPrefix: string;
  label: string;
  labelPlural: string;
  layoutable: boolean;
  listviewable?: any;
  lookupLayoutable?: any;
  mergeable: boolean;
  mruEnabled: boolean;
  name: string;
  namedLayoutInfos: any[];
  networkScopeFieldName?: any;
  queryable: boolean;
  recordTypeInfos: RecordTypeInfo[];
  replicateable: boolean;
  retrieveable: boolean;
  searchLayoutable: boolean;
  searchable: boolean;
  supportedScopes: SupportedScope[];
  triggerable: boolean;
  undeletable: boolean;
  updateable: boolean;
  urls: Urls2;
}

export interface ChildRelationship {
  cascadeDelete: boolean;
  childSObject: string;
  deprecatedAndHidden: boolean;
  field: string;
  junctionIdListNames: any[];
  junctionReferenceTo: any[];
  relationshipName: string;
  restrictedDelete: boolean;
}

export interface Field {
  aggregatable: boolean;
  autoNumber: boolean;
  byteLength: number;
  calculated: boolean;
  calculatedFormula?: any;
  cascadeDelete: boolean;
  caseSensitive: boolean;
  compoundFieldName?: any;
  controllerName?: any;
  createable: boolean;
  custom: boolean;
  defaultValue?: boolean;
  defaultValueFormula?: any;
  defaultedOnCreate: boolean;
  dependentPicklist: boolean;
  deprecatedAndHidden: boolean;
  digits: number;
  displayLocationInDecimal: boolean;
  encrypted: boolean;
  externalId: boolean;
  extraTypeInfo?: any;
  filterable: boolean;
  filteredLookupInfo?: any;
  groupable: boolean;
  highScaleNumber: boolean;
  htmlFormatted: boolean;
  idLookup: boolean;
  inlineHelpText?: any;
  label: string;
  length: number;
  mask?: any;
  maskType?: any;
  name: string;
  nameField: boolean;
  namePointing: boolean;
  nillable: boolean;
  permissionable: boolean;
  picklistValues: any[];
  polymorphicForeignKey: boolean;
  precision: number;
  queryByDistance: boolean;
  referenceTargetField?: any;
  referenceTo: string[];
  relationshipName: string;
  relationshipOrder?: any;
  restrictedDelete: boolean;
  restrictedPicklist: boolean;
  scale: number;
  searchPrefilterable: boolean;
  soapType: string;
  sortable: boolean;
  type: string;
  unique: boolean;
  updateable: boolean;
  writeRequiresMasterRead: boolean;
}

export interface Urls {
  layout: string;
}

export interface RecordTypeInfo {
  active: boolean;
  available: boolean;
  defaultRecordTypeMapping: boolean;
  master: boolean;
  name: string;
  recordTypeId: string;
  urls: Urls;
}

export interface SupportedScope {
  label: string;
  name: string;
}

export interface Urls2 {
  compactLayouts: string;
  rowTemplate: string;
  approvalLayouts: string;
  uiDetailTemplate: string;
  uiEditTemplate: string;
  defaultValues: string;
  describe: string;
  uiNewRecord: string;
  quickActions: string;
  layouts: string;
  sobject: string;
}

export interface DescribeSObjectResult {
  result: SObject;
}

export enum SObjectCategory {
  ALL = 'ALL',
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM'
}

type SubRequest = { method: string; url: string };
type BatchRequest = { batchRequests: SubRequest[] };

type SubResponse = { statusCode: number; result: SObject };

type BatchResponse = { hasErrors: boolean; results: SubResponse[] };

export class SObjectDescribe {
  private accessToken: string = '';
  private instanceUrl: string = '';
  private readonly servicesPath: string = 'services/data';
  // the targetVersion should be consistent with the Cli even if only using REST calls
  private targetVersion = '';
  private readonly versionPrefix = 'v';
  private readonly sobjectsPart: string = 'sobjects';
  private readonly batchPart: string = 'composite/batch';

  // get the token and url by calling the org - short term, should really be able to get it from the sfdx project
  // also set the proper target apiVersion
  private async setupConnection(username?: string) {
    if (this.accessToken === '') {
      let orgInfo: any;
      const builder = new CommandBuilder().withArg('force:org:display');
      if (username) {
        builder.args.push('--targetusername', username);
      }
      const command = builder.build();
      const execution = new CliCommandExecutor(command);
      orgInfo = await execution.execute();
      this.accessToken = orgInfo.accessToken;
      this.instanceUrl = orgInfo.instanceUrl;
    }
    if (!this.targetVersion) {
      this.targetVersion = constants.API_VERSION;
    }
  }

  private getVersion(): string {
    return `${this.versionPrefix}${this.targetVersion}`;
  }

  public async describeGlobal(
    type: SObjectCategory,
    username?: string
  ): Promise<string[]> {
    const builder = new CommandBuilder()
      .withArg('force:schema:sobject:list')
      .withFlag('--sobjecttypecategory', type.toString());
    if (username) {
      builder.args.push('--targetusername', username);
    }
    const command = builder.build();
    const execution = new CliCommandExecutor(command);

    let result: string[];
    try {
      result = await execution.execute();
      return Promise.resolve(result);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public async describeSObjectBatch(
    types: string[],
    nextToProcess: number,
    username?: string
  ): Promise<SObject[]> {
    const batchSize = 25;

    await this.setupConnection(username);

    const batchRequest: BatchRequest = { batchRequests: [] };

    for (
      let i = nextToProcess;
      i < nextToProcess + batchSize && i < types.length;
      i++
    ) {
      vscode.window.forceCode.outputChannel.appendLine('Processing decription for ' + types[i]);
      const urlElements = [
        this.getVersion(),
        this.sobjectsPart,
        types[i],
        'describe'
      ];
      const requestUrl = urlElements.join('/');

      batchRequest.batchRequests.push({ method: 'GET', url: requestUrl });
    }
    const batchUrlElements = [
      this.instanceUrl,
      this.servicesPath,
      this.getVersion(),
      this.batchPart
    ];
    const batchRequestUrl = batchUrlElements.join('/');
    const options: XHROptions = {
      type: 'POST',
      url: batchRequestUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `OAuth ${this.accessToken}`,
        'User-Agent': 'salesforcedx-extension',
        'Sforce-Call-Options': `client=${CLIENT_ID}`
      },
      data: JSON.stringify(batchRequest)
    };

    try {
      const response: XHRResponse = await xhr(options);
      const batchResponse = JSON.parse(response.responseText) as BatchResponse;
      const fetchedObjects: SObject[] = [];
      let i = nextToProcess;
      for (const sr of batchResponse.results) {
        if (sr.result instanceof Array) {
          if (sr.result[0].errorCode && sr.result[0].message) {
            console.log(`Error: ${sr.result[0].message} - ${types[i]}`);
          }
        }
        i++;
        fetchedObjects.push(sr.result);
      }
      return Promise.resolve(fetchedObjects);
    } catch (error) {
      const xhrResponse: XHRResponse = error;
      return Promise.reject(xhrResponse.responseText);
    }
  }
}
