import * as vscode from 'vscode';
import { ForceService } from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import { editorUpdateApexCoverageDecorator, documentUpdateApexCoverageDecorator, updateDecorations } from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as parsers from './parsers';

export function activate(context: vscode.ExtensionContext): any {
    vscode.window.forceCode = new ForceService();

    commands.default.forEach(cur => {
        context.subscriptions.push(vscode.commands.registerCommand(cur.name, cur.command));
    });
    
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sflog', new ForceCodeLogProvider()));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('forcecode', new ForceCodeContentProvider()));

    // AutoCompile Feature
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        if (toolingType && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            vscode.window.forceCode.runCommand('ForceCode.compile', context);
        }
        var isResource: RegExpMatchArray = textDocument.fileName.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
        if (isResource.index && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            vscode.window.forceCode.runCommand('ForceCode.staticResource', context);
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function(event) {
        // clear the code coverage
        var file = parsers.getWholeFileName(event.document);
        // get the id
        var curFileId: string = vscode.window.forceCode.workspaceMembers.find(cur => {
            return cur.memberInfo.fileName.split('/')[1] === file;
        }).memberInfo.id;
        
        if(curFileId && vscode.window.forceCode.codeCoverage[curFileId]) {
            delete vscode.window.forceCode.codeCoverage[curFileId];
            updateDecorations();
        }
    }));
    
    // Text Coverage Decorators
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editorUpdateApexCoverageDecorator));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(documentUpdateApexCoverageDecorator));
}
