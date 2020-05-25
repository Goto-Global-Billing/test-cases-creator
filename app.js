const express = require('express');
const sql = require("mssql");
var cors = require('cors');
const app = express();
require('dotenv').config();

const API_PORT = 3001;
//config for your database
var config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,    
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE 
};

app.use(cors());

app.get('/billing-lines/:reservationId', function (req, res) {    
    const { reservationId } = req.params;   

    if(!reservationId) {
        console.error('reservationId is empty');
        return;
    }

    sql.on('error', err => { console.log('DB Connection error: ', err); })

    sql.connect(config)
    .then(pool => {       
        return pool.request()
            .input('reservationId', sql.NVarChar(50), reservationId)
            .query(`
                    select bl.u_OrigCDRID, 
                        bl.Source as source, 
                        case 
                            when bl.Source = 1 then 'A2A'
                            when bl.Source = 2 then 'A2B'
                            else 'NONE' end as sourceName,
                        bl.ChargeType as chargeFactorID,
                        cf.[Description] as chargeFactorName,
                        bl.p_RatingCodeID as ratingCodeID,
                        rc.[Description] as ratingCodeName,
                        bl.FromDate as fromDate, 
                        bl.Quantity as quantity, 
                        bl.TotalAmount as totalAmount, 
                        bl.b_BillingLineTextID as billingLineTextID,
                        bt.[Description] as billingLineTextName
                    from dbo.b_BillingLine bl 
                    inner join p_ChargeFactor cf on bl.ChargeType = cf.ID
                    inner join p_RatingCode rc on bl.p_RatingCodeID = rc.ID
                    inner join b_BillingLineText bt on bl.b_BillingLineTextID = bt.ID
                    where bl.OrigCDRExtID = @reservationId and bl.IsActive = 1            
            `)
    }).then(result => {
        // send records as a response
        res.send(result.recordset);
    }).catch(err => {
        res.send(err);
    });
});


app.get('/usage-record/:reservationId', function (req, res) {    
    const { reservationId } = req.params;   

    if(!reservationId) {
        console.error('reservationId is empty');
        return;
    }

    sql.on('error', err => { console.log('DB Connection error: ', err); })

    sql.connect(config)
    .then(pool => {       
        return pool.request()
            .input('reservationId', sql.NVarChar(50), reservationId)
            .query(`
                    select ExtID as UsageID,
                    case when IsToCharge = 1 then 'true' else 'false' end as Charge,
                    CDRText as UsageData
                    from u_OrigCDR
                    where ExtID = @reservationId and IsActive = 1            
            `)
    }).then(result => {
        // send records as a response
        res.send(result.recordset);
    }).catch(err => {
        res.send(err);
    });
});


//launch server into a port
app.listen(API_PORT, () =>  console.log('Server is running..'));