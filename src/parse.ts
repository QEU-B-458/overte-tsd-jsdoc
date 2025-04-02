import * as fs from 'fs';
import * as path from 'path';

export const parseAndSaveOutput = (outputLog: any, outputDirectory: string): void =>{

    // Regex to match an optional preceding comment block and the class definition
    const pattern = /(\/\*\*[\s\S]*?\*\/)?\s*(declare class (\w+)\s*{(?:[^{}]*{[^{}]*}[^{}]*)*})/g;
	console.log('we ran')

    let match;
    while ((match = pattern.exec(outputLog)) !== null) {
        const commentBlock = match[1] || ""; // Use an empty string if no comment
        const fullClassDef = match[2];
        const className = match[3];
		console.log('we ran', match)
        // Define file path
        const filePath = path.join(outputDirectory, `${className}.ts`);

        // Save extracted content to a file
        fs.writeFileSync(filePath, `${commentBlock}\n${fullClassDef}`, 'utf-8');

        console.log(`Saved: ${filePath}`);
    }
}

export default parseAndSaveOutput