const { authenticate } = require('./auth');
const { callMethod, xmlIdToResID } = require('./helps');
const params = require('./params.json');

const _prepare_order = async (uid) => {
    try {
        let order = {
            partner_id: await xmlIdToResID(params.order.partner_id, uid),
            date_order: params.order.date_order,
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
        let order_line = [];
        for (const param of params.order.order_line) {
            order_line.push([0, 0, {
                product_id: await xmlIdToResID(param.product_id, uid),
                product_uom_qty: param.product_uom_qty,
                price_unit: param.price_unit,
                tax_id: [[6, 0, await Promise.all(param.tax_id.map(tax => xmlIdToResID(tax, uid)))]],
            }]);
        }
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
        const result = await callMethod(uid, 'stock.picking', 'button_validate', [[pickingId]], { context: { skip_sms: true } });
        console.log('button_validate result:', JSON.stringify(result, null, 2));
        if (result === true) {
            console.log(`Stock Picking ${pickingId} validated successfully with no backorder.`);            
        } else if (result.res_model === 'confirm.stock.sms') {
            // confirmar el wizard de SMS y continuar sin enviar
            await callMethod(uid, 'confirm.stock.sms', 'action_cancel', [[result.res_id]]);
            // await callMethod(uid, 'confirm.stock.sms', 'action_confirm', [[result.res_id]]);
            console.log(`Stock Picking ${pickingId} validated successfully.`);
        } else if (result.res_model === 'stock.backorder.confirmation') {
            // StockBackorderConfirmation
            const backorder = await callMethod(uid, 'stock.backorder.confirmation', 'create', [[{
                pick_ids: result.context.default_pick_ids
            }]]);
            console.log(`Stock Picking ${pickingId} validated successfully.`);
            if (backorder) {
                await callMethod(uid, 'stock.backorder.confirmation', 'process', [[backorder[0]]]);
                console.log(`Backorder ${backorder[0]} confirmed successfully.`);
            }
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