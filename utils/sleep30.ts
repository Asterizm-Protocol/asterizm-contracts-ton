import type { UIProvider } from '@ton/blueprint';

export async function sleep30(ui: UIProvider) {
    ui.write('Sleeping 30 sec...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    ui.write('Sleeping 20 sec...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    ui.write('Sleeping 10 sec...');
    await new Promise(resolve => setTimeout(resolve, 10000));
}