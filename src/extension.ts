import * as vscode from 'vscode';
import * as esprima from 'esprima';

// Function to activate the extension
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "ShortCircuitLinter" activated');

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('shortCircuitLinter');
    context.subscriptions.push(diagnosticCollection);

    // Command to manually trigger linting
    let disposable = vscode.commands.registerCommand('shortCircuitLinter.lint', () => {
        lintActiveEditor(diagnosticCollection);
    });

    context.subscriptions.push(disposable);

    // Trigger linting on document save and change
    vscode.workspace.onDidSaveTextDocument(() => lintActiveEditor(diagnosticCollection));
    vscode.workspace.onDidChangeTextDocument(() => lintActiveEditor(diagnosticCollection));
}

// Main function to lint the active editor
function lintActiveEditor(diagnosticCollection: vscode.DiagnosticCollection) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'javascript') {
        const text = editor.document.getText();

        // Clear previous diagnostics
        diagnosticCollection.clear();

        const diagnostics = detectShortCircuit(text);
        diagnosticCollection.set(editor.document.uri, diagnostics);
    }
}

// Function to detect short-circuit issues in JavaScript code
function detectShortCircuit(text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    try {
        // Parse JavaScript code into an AST
        const ast = esprima.parseScript(text, { loc: true, range: true });

        // Traverse AST to find logical expressions
        traverseAST(ast, node => {
            if (node.type === 'LogicalExpression' && (node.operator === '&&' || node.operator === '||')) {
                const left = node.left;
                const right = node.right;

                // Check if the right operand has a potential side effect
                if (isComplexExpression(right) && right.range && right.loc) {
                    const message = `Warning: Short-circuit may skip evaluation of '${text.substring(right.range[0], right.range[1])}'`;
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(right.loc.start.line - 1, right.loc.start.column),
                            new vscode.Position(right.loc.end.line - 1, right.loc.end.column)
                        ),
                        message,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostics.push(diagnostic);
                }
            }
        });
    } catch (error) {
        console.error('Error parsing JavaScript code:', error);
    }

    return diagnostics;
}

// Helper function to check if an expression might have side effects
function isComplexExpression(node: any): boolean {
    return node.type === 'CallExpression' || node.type === 'BinaryExpression';
}

// Helper function to traverse AST nodes
function traverseAST(node: any, callback: (node: any) => void) {
    callback(node);
    for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
            traverseAST(node[key], callback);
        }
    }
}

// Deactivate function for the extension
export function deactivate() {}
