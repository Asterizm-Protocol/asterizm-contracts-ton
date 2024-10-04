import fs from 'fs/promises';

export async function saveJson(filePath:string, data: any) {
    try {
        const jsonString = JSON.stringify(data, null, 2); // Convert JSON object to string with pretty-print
        await fs.writeFile(filePath, jsonString, 'utf8');
        console.log(`JSON saved to ${filePath}`);
    } catch (error) {
        console.error('Error saving JSON to file:', error);
    }
}