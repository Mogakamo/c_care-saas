'use strict';
const router = require('express').Router();
const { VoiceHelper,ModdedATVoice } = require('../utils/IVR_helpers');
const { PrismaClient } = require('@prisma/client');
const signale = require('signale');
const prisma = new PrismaClient();

let AT_apiKey = process.env.AT_APP_APIKEY,
    AT_username = process.env.AT_APP_USERNAME,
    AT_virtualNumber = process.env.AT_VIRTUAL_NUMBER,
    APP_URL = process.env.APP_URL;

const ATVoice = new VoiceHelper({
    AT_apiKey,
    AT_username,
    AT_virtualNumber,
});

router.get('/', async (req, res) => {
    res.render('keypad.html.ejs');
});

router.get('/bulk', (req, res) => { 
    // http://localhost:3000/bulk?phones=0705212848,0773841221
    var phones = req.query.phones;
    var phoneArray = phones.split(',');

    
function makeCall_Promisified(to) {
    return new Promise((resolve, reject) => {
        
        if (to.startsWith('+254')) {
            //Good to go
        } else if (to.startsWith('254')) {
            var badNo = to.split('');
            badNo.splice(0, 3);
            badNo = badNo.join('');
            to = `+254${badNo}`;
        } else {
            //Add a prefix of +254
            to = `+254${to}`;
        }
    console.log({ to }); 
    const options = {
        // Set your Blanqx's Cloud phone number in international format
        callFrom: process.env.AT_VIRTUAL_NUMBER,
        // Set the numbers you want to call to in a comma-separated list
        callTo: [to],
        clientRequestId:'bulk'
    };

    console.log({ options });

    
    // Make the call
    ModdedATVoice({
        AT_apiKey:process.env.AT_APP_APIKEY,
        AT_username:process.env.AT_APP_USERNAME
    })
        .call(options)
        .then((callData) => {
            // console.log({ callData })
            // console.log(Object.keys(callData)) 
            resolve({
                status:'succesful',
                ...callData
            });
        })
        .catch((err) => {
            console.log({ err });
            reject({
                status:'failed',
                ...err
            })
        });

    });
}


    var phoneArray_Promisified = phoneArray.map(phone => {
        // replace the first 0 with +254
        phone = phone.replace(/^0/, '254').trim(); 
        return makeCall_Promisified(`+${phone}`);
    });
    
Promise.all(phoneArray_Promisified)
.then((queuedCalls) => {
    console.log(queuedCalls);
    res.send(queuedCalls);
})
.catch(err => {
    signale.error({err});
})


    
});
router.post('/business', async (req, res) => {
    const { business_name, business_at_phone, business_at_apiKey, business_at_username, number_of_agents } = req.body;
    const business = await prisma.business.create({
        data: {
            business_name: business_name,
            business_at_phone: business_at_phone,
            business_at_apiKey: business_at_apiKey,
            business_at_username: business_at_username,
            number_of_agents: number_of_agents
        },
    });
    res.redirect(`/business/${business.id}`);
});

router.get("/business/:id", async(req, res) => {
    const businesses = await prisma.business.findMany();
    // res.render("business.html.ejs", { businesses });
    res.json(businesses);
})

router.post('/customerAgent', async (req, res) => {
    // Customer agent
    const { agent_name } = req.body;

    const CustomerAgent = await prisma.customerAgent.create({
        data: {
            agent_name: agent_name,
        },
    });
    res.json(CustomerAgent);
});

router.get('/customerAgent/:id', async(req, res) => {
    const customerAgents = await prisma.customerAgent.findMany();
    res.json(customerAgents);
})

router.post('/capability-token', async (req, res) => {
    let clientname = req.body.clientname || 'doctor';
    let callRepresentativeName = ATVoice.generateATClientName({
        isForInitialization: true,
        firstName: clientname,
    });
    const ct = await ATVoice.generateCapabilityToken({
        callRepresentativeName,
    });
    ct.status === 'successful'
        ? res.json({ ...ct.data })
        : res.json({ failed: true });
});

router.post('/callback_url', async (req, res) => {
    try {

        let clientDialedNumber = req.body.clientDialedNumber;
        let callActions, responseAction, redirectUrl, lastRegisteredClient;
        let callerNumber = req.body.callerNumber;
        let destinationNumber = req.body.destinationNumber;

        if(req.body.clientRequestId === 'bulk'){
            callActions= ATVoice.saySomething({
                speech:'Hi there! I am hereby welcoming you to watch a new movie. The black panther.'
            })
        }
        
        if (clientDialedNumber) {
            // assumes a browser tried to make a call to either virtualNumber(Dequeue) or a customer number(outgoing call)

            if (clientDialedNumber === AT_virtualNumber) {
                // Browser wants to dequeue a call - ignore this logic for now
            } else {
                // Browser wants to make a call to a customer number
                callActions = ATVoice.converseViaBrowser({
                    role: 'VCC_TO_CUSTOMER',
                    customerNumber: clientDialedNumber,
                });
            }
        } else {
            // Here we assume the call is incoming from a customer to the hospital
            // Lead customer to survey form: DTMF
            callActions = ATVoice.survey({
                textPrompt: `Welcome to Vendor 1 business and thank you for calling Press 1 to speak to the owner. Press 2 to speak to a customer care agent. Press 3 to leave a message. After selecting your option, press the hash key`,
                finishOnKey: '#',
                timeout: 7,
                callbackUrl: `${APP_URL}/survey`,
            });
        }

        responseAction = `<?xml version="1.0" encoding="UTF-8"?><Response>${callActions}</Response>`;
        console.log({ responseAction });
        return res.send(responseAction);
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

module.exports = router;
