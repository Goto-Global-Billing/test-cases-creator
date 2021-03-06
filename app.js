const express = require('express');
const sql = require("mssql");
var cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());

const API_PORT = 3001;
//config for your database
var configTestDB = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,    
    server: process.env.DB_TEST_SERVER,
    database: process.env.DB_TEST_DATABASE
};

var configProdDB = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,    
    server: process.env.DB_PROD_SERVER,
    database: process.env.DB_PROD_DATABASE
};

const poolTestDB = new sql.ConnectionPool(configTestDB);
const poolTestDBConnect = poolTestDB.connect();

const poolProdDB = new sql.ConnectionPool(configProdDB);
const poolProdDBConnect = poolProdDB.connect();
 
poolTestDB.on('error', err => {
    console.error('*****poolTestDB error handler', err);
});

poolProdDB.on('error', err => {
    console.error('*****poolProdDB error handler', err);
});

const runPoolTestDB  = async (res, query, reservationId) => {
    await poolTestDBConnect;
    try {
        const request = poolTestDB.request();
        if(reservationId) request.input('reservationId', sql.NVarChar(50), reservationId);        
        const result = await request.query(query);        
        res.send(result.recordset); 
    } catch (err) {
        console.error('****runPoolTestDB SQL error', err);
        res.send(err);
    }
}

const runPoolProdDB  = async (res, query, reservationId) => {
    await poolProdDBConnect;
    try {
        const request = poolProdDB.request();
        if(reservationId) request.input('reservationId', sql.NVarChar(50), reservationId);        
        const result = await request.query(query);        
        res.send(result.recordset); 
    } catch (err) {
        console.error('****runPoolProdDB SQL error', err);
        res.send(err);
    }
}

const billingLinesQuery = () => {
    return `
    select bl.u_OrigCDRID, 
        bl.Source as source, 
        case 
            when bl.Source = 1 then 'A2A'
            when bl.Source = 2 then 'A2B'
            else 'NONE' end as sourceName,
        bl.p_ChargeFactorID as chargeFactorID,
        cf.[Description] as chargeFactorName,
        bl.p_RatingCodeID as ratingCodeID,
        rc.[Description] as ratingCodeName,
        bl.FromDate as fromDate, 
        bl.Quantity as quantity, 
        bl.TotalAmount as totalAmount, 
        bl.b_BillingLineTextID as billingLineTextID,
        bt.[Description] as billingLineTextName
    from dbo.b_BillingLine bl 
    inner join p_ChargeFactor cf on bl.p_ChargeFactorID = cf.ID
    inner join p_RatingCode rc on bl.p_RatingCodeID = rc.ID
    inner join b_BillingLineText bt on bl.b_BillingLineTextID = bt.ID
    where bl.OrigCDRExtID = @reservationId and bl.IsActive = 1            
`;
}

const usageRecordQuery = () => {
    return `
                    select ExtID as UsageID,
                    case when IsToCharge = 1 then 'true' else 'false' end as Charge,
                    CDRText as UsageData
                    from u_OrigCDR
                    where ExtID = @reservationId and IsActive = 1            
            `;
}

const billingLineTextQuery = () => {
    return `
        select ID, [Description] from b_BillingLineText
        order by [Description]
    `;
}

const chargeFactorQuery = () => {
    return `
        select ID, [Description] from p_ChargeFactor
        order by ID
    `;
}

const ratingCodeQuery = () => {
    return `
        select ID, [Description] from p_RatingCode
        order by ID
    `;
}

app.get('/', function (req, res) {
    res.send('This is a Magic Billing Application!');
  });

app.get('/billing-lines/:reservationId/:db', function (req, res) {    
    const { reservationId, db } = req.params;     
    
    if(!reservationId) {
        console.error('reservationId is empty');
        return;
    }

    if(!db) {
        console.error('db is empty');
        return;
    }
    
    if(db === "1")
        runPoolTestDB(res, billingLinesQuery(), reservationId); 
    else
        runPoolProdDB(res, billingLinesQuery(), reservationId);    
});


app.get('/usage-record/:reservationId/:db', function (req, res) {    
    const { reservationId, db } = req.params;   

    if(!reservationId) {
        console.error('reservationId is empty');
        return;
    }

    if(!db) {
        console.error('db is empty');
        return;
    }    

    if(db === "1")
        runPoolTestDB(res, usageRecordQuery(), reservationId); 
    else
        runPoolProdDB(res, usageRecordQuery(), reservationId);  
});

app.get('/get-billingline-text', function (req, res) { 
     
     runPoolTestDB(res, billingLineTextQuery());   
});

app.get('/get-charge-factor', function (req, res) {   
   
   runPoolTestDB(res, chargeFactorQuery()); 
});

app.get('/get-rating-code', function (req, res) {     
    
    runPoolTestDB(res, ratingCodeQuery()); 
});


//launch server into a port
app.listen(API_PORT, () =>  console.log('Server is running..'));