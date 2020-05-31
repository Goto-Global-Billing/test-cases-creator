const express = require('express');
const sql = require("mssql");
var cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());

const API_PORT = 3001;
//config for your database
var config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,    
    server: process.env.DB_SERVER,
    database: process.env.DB_CURRENT_DATABASE
};

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

const runQuery = (res, query, reservationId) => {
    sql.on('error', err => { console.log('DB Connection error: ', err); })    
    
    sql.connect(config)
    .then(pool => {              
        return pool.request()
            .input('reservationId', sql.NVarChar(50), reservationId)
            .query(query)
    }).then(result => {              
        // send records as a response
        res.send(result.recordset);
    }).then(() => {        
        return sql.close();
    }).catch(err => {              
        res.send(err);
        return sql.close();
    });
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

    config.database = db === "1" ? process.env.DB_CURRENT_DATABASE : process.env.DB_OLD_DATABASE;
    
    runQuery(res, billingLinesQuery(), reservationId);  
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

    config.database = db === "1" ? process.env.DB_CURRENT_DATABASE : process.env.DB_OLD_DATABASE;

    runQuery(res, usageRecordQuery(), reservationId);  
});

//launch server into a port
app.listen(API_PORT, () =>  console.log('Server is running..'));