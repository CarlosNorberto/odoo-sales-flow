require('dotenv').config();
const inquirer = require('inquirer');
const { authenticate } = require('./auth');
const { createSaleOrder, confirmSaleOrder, getPickingIdForSale, validateAndCreateBackorderStockPicking, createInvoiceFromSale, confirmInvoice } = require('./operations');

const MENU_CHOICES = [
    new inquirer.Separator('── Pasos individuales ──────────────'),
    { name: '1. Autenticar', value: 'auth' },
    { name: '2. Crear venta', value: 'create_sale' },
    { name: '3. Crear y confirmar venta', value: 'confirm_sale' },
    { name: '4. Crear, confirmar y validar salida de productos', value: 'validate_stock' },
    { name: '5. Crear, confirmar y crear factura', value: 'create_invoice' },
    { name: '6. Confirmar factura (Flujo completo)', value: 'confirm_invoice' },    
    new inquirer.Separator('───────────────────────────────────'),    
    { name: '   Salir', value: 'exit' },
];

const log = {
    info: (msg) => console.log(`\n  ℹ  ${msg}`),
    ok: (msg, data) => {
        console.log('\n');
        console.log(`  ✔  ${msg}`)
        if (data) {
            console.log('------------------------------------------------');
            console.log(`${data}`);
            console.log('------------------------------------------------');
        }
        console.log('\n');
    },
    error: (msg) => console.error(`  ✖  ${msg}`),
    data: (key, val) => console.log(`     ${key}: ${val}`),
    divider: () => console.log('\n' + '─'.repeat(52)),
};

// STEPS
async function stepAuthenticate() {    
    try {
        const uid = await authenticate();
        log.ok('Autenticación exitosa', `User ID: ${uid}`);        
    } catch (error) {
        log.error('Error de autenticación:');
        log.error(error.message);
    }
}

async function stepCreateSale() {
    const saleId = await createSaleOrder();
    log.ok('Venta creada con éxito', `ID de la venta: ${saleId}`);
}

async function stepConfirmSale() {
    const saleId = await createSaleOrder();
    await confirmSaleOrder(saleId);
    log.ok('Venta creada y confirmada con éxito', `ID de la venta: ${saleId}`);
}

async function stepValidateStock() {
    const saleId = await createSaleOrder();
    await confirmSaleOrder(saleId);    
    const pickingId = await getPickingIdForSale(saleId);
    await validateAndCreateBackorderStockPicking(pickingId);
    log.ok('Venta creada, confirmada y salida de productos validada con éxito', `ID de la venta: ${saleId}, ID del picking: ${pickingId}`);
}

async function stepCreateInvoice() {
    const saleId = await createSaleOrder();
    await confirmSaleOrder(saleId);    
    const invoiceId = await createInvoiceFromSale(saleId);
    log.ok('Venta creada, confirmada y factura creada con éxito', `ID de la venta: ${saleId}, ID de la factura: ${invoiceId}`);
}

async function stepConfirmInvoice() {
    const saleId = await createSaleOrder();
    await confirmSaleOrder(saleId);
    const invoiceId = await createInvoiceFromSale(saleId);
    await confirmInvoice(invoiceId);
    log.ok('Venta creada, confirmada, factura creada y confirmada con éxito', `ID de la venta: ${saleId}, ID de la factura confirmada: ${invoiceId}`);
}

async function main() {    
    let running = true;

    while (running) {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '¿Qué querés ejecutar?',
                choices: MENU_CHOICES,
                pageSize: 12,
            },
        ]);

        try {
            switch (action) {
                case 'auth': await stepAuthenticate(); break;
                case 'create_sale': await stepCreateSale(); break;
                case 'confirm_sale': await stepConfirmSale(); break;
                case 'validate_stock': await stepValidateStock(); break;
                case 'create_invoice': await stepCreateInvoice(); break;
                case 'confirm_invoice': await stepConfirmInvoice(); break;                
                case 'exit': running = false; break;
            }
        } catch (err) {            
            log.error('Ocurrió un error:');
            log.error(err.message);
            process.exit(1);
        }
    }

    console.log('Hasta luego!');
}

main();