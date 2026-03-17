const axios = require('axios');

const callMethod = async (uid, model, method, args, kwargs={}) => {
    try {
        let odooUrl = process.env.ODOO_URL;
        if(process.env.ODOO_PORT){
            odooUrl += ':' + process.env.ODOO_PORT;
        }        
        const db = process.env.ODOO_DB;
        const password = process.env.ODOO_PASS
        const response = await axios.post(`${odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute_kw',
                args: [db, uid, password, model, method, args, kwargs],
            },
            id: Math.floor(Math.random() * 1000)
        });    
        return response.data.result        
    } catch (error) {
        throw new Error(`Error in callMethod: ${error}`);        
    }
}

const xmlIdToResID = async (xmlid, uid) =>{
    try {
        let domain = [['module', '=', xmlid.split('.')[0]], ['name', '=', xmlid.split('.')[1]]];    
        const id = await callMethod(uid, 'ir.model.data', 'search_read', [domain] , {fields:['res_id'], limit: 1});
        if (!id.length) {
            throw new Error(`${xmlid} not found`);
        }
        return id[0].res_id;        
    } catch (error) {
        throw new Error(`Error in xmlIdToResID: ${error}`);        
    }
}

module.exports = {
    callMethod,
    xmlIdToResID
}