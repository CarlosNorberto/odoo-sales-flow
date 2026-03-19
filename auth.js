const axios = require('axios');

const authenticate = async () => {
    let odooUrl = process.env.ODOO_URL;
    if(process.env.ODOO_PORT){
        odooUrl += ':' + process.env.ODOO_PORT;
    }    
    const db = process.env.ODOO_DB;
    const username = process.env.ODOO_USER;
    const password = process.env.ODOO_PASS;
    
    const response = await axios.post(`${odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
            service: 'common',
            method: 'login',
            args: [db, username, password],
        },
        id: Math.floor(Math.random() * 1000)
    });
    if(response.data.error){
        const msg = response.data.error.data?.message || response.data.error.message || 'Error desconocido';
        throw new Error(`Odoo authentication error: ${msg}`);
    }

    if(response.data.result){        
        return response.data.result;
    }else{
        throw new Error('Authentication Failed');
    }
}

module.exports = {
    authenticate
}