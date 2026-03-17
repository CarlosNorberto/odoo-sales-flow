const { authenticate } = require('./auth');
const { callMethod, xmlIdToResID } = require('./helps');

const _prepare_order = async (uid) => {
    try {
        let order = {
            partner_id: await xmlIdToResID('base.res_partner_12', uid),
            date_order: '2026-01-01',
            // order_type: 'out_invoice',
            // description: 'Test Sale Order',
            // warehouse_id: await xmlIdToResID('stock.warehouse_demo', uid),
            // stock_location_id: await xmlIdToResID('stock.stock_location_demo', uid),
            // process_type: 'order',
        }
        return order;
    } catch (error) {
        throw new Error(`Error in _prepare_order: ${error}`);
    }
}

const _prepare_order_line = async (uid) => {
    try {
        let tax_ids = [
            await xmlIdToResID('account.1_sale_tax_template', uid),
            await xmlIdToResID('account.1_purchase_tax_template', uid)
        ];
        let order_line = [
            [0, 0, {
                product_id: await xmlIdToResID('sale.product_product_4e', uid),
                name: 'Test Order Line',
                // account_id: await xmlIdToResID('account.account_demo_01', uid),
                product_uom_qty: 1,
                price_unit: 100,
                tax_id: [[6, 0, tax_ids]],
            }],
            [0, 0, {
                product_id: await xmlIdToResID('product.desk_organizer', uid),
                name: 'Test Order Line 2',
                // account_id: await xmlIdToResID('account.account_demo_01', uid),
                product_uom_qty: 2,
                price_unit: 50,
                tax_id: [[6, 0, tax_ids]],
            }]
        ]
        return order_line;
    } catch (error) {
        throw new Error(`Error in _prepare_order_line: ${error}`);
    }
}

async function createSaleOrder() {
    try {
        const uid = await authenticate();
        let order = await _prepare_order(uid);        
        const orderLine = await _prepare_order_line(uid);
        order.order_line = orderLine;
        const newOrder = await callMethod(uid, 'sale.order', 'create', [[order]]);        
        // const getOrder = await callMethod(uid, 'sale.order', 'search_read', [[['id', '=', newOrder[0]]]], { fields: ['name', 'date_order', 'description'] });
        if (!newOrder) {
            throw new Error('Failed to create sale order');
        }
        return newOrder[0];
    } catch (error) {
        throw new Error(`Error in createSaleOrder: ${error}`);
    }
}

async function confirmSaleOrder(orderId) {
    try {
        const uid = await authenticate();
        await callMethod(uid, 'sale.order', 'action_confirm', [[orderId]]);
        console.log(`Sale Order ${orderId} confirmed successfully.`);
    } catch (error) {
        console.error(`Error confirming sale order ${orderId}:`, error.message);
    }
}

async function getPickingIdForSale(saleId) {
    try {
        const uid = await authenticate();
        const pickings = await callMethod(uid, 'stock.picking', 'search_read', [[['sale_id', '=', saleId]]], { fields: ['id'] });
        if (pickings.length === 0) {
            throw new Error(`No pickings found for sale order ${saleId}`);
        }
        return pickings[0].id;
    } catch (error) {
        throw new Error(`Error in getPickingIdForSale: ${error}`);
    }
}

async function validateAndCreateBackorderStockPicking(pickingId) {
    try {
        const uid = await authenticate();
        await callMethod(uid, 'stock.picking', 'button_validate', [[pickingId]]);
        // StockBackorderConfirmation
        const backorder = await callMethod(uid, 'stock.backorder.confirmation', 'create', [[{
            pick_ids: [[6, 0, [pickingId]]],
        }]]);
        console.log(`Stock Picking ${pickingId} validated successfully.`);
        if (backorder) {
            await callMethod(uid, 'stock.backorder.confirmation', 'process', [[backorder[0]]]);
            console.log(`Backorder ${backorder[0]} confirmed successfully.`);
        }
    } catch (error) {
        console.error(`Error validating stock picking ${pickingId}:`, error.message);
    }
}

async function createInvoiceFromSale(saleId) {
    try {
        const uid = await authenticate();
        const wizardId = await callMethod(uid, 'sale.advance.payment.inv', 'create', [[{
            sale_order_ids: [[6, 0, [saleId]]],
            advance_payment_method: 'delivered',
        }]]);
        if (!wizardId) {
            throw new Error('Failed to create sale advance payment');
        }
        const respWizard = await callMethod(uid, 'sale.advance.payment.inv', 'create_invoices', [[wizardId[0]]]);        
        return respWizard.res_id;
    } catch (error) {
        throw new Error(`Error in createInvoiceFromSale: ${error}`);
    }
}

async function confirmInvoice(invoiceId) {
    try {
        const uid = await authenticate();
        await callMethod(uid, 'account.move', 'action_post', [[invoiceId]]);
        console.log(`Invoice ${invoiceId} confirmed successfully.`);
    } catch (error) {
        console.error(`Error confirming invoice ${invoiceId}:`, error.message);
    }
}

module.exports = {
    createSaleOrder,
    confirmSaleOrder,
    getPickingIdForSale,
    validateAndCreateBackorderStockPicking,
    createInvoiceFromSale,
    confirmInvoice,
}