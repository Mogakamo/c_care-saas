require('dotenv').config({
    path: './.env',
});
const port = process.env.PORT || 9000;
const express = require('express');
const path = require('path');
const { Prisma, PrismaClient } = require('@prisma/client');

let indexRoutes = require('./routes/index.js');

const main = async () => {
    const app = express();

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/', indexRoutes);
    app.use('*', (req, res) => res.status(404).send('404 Not Found'));

    app.listen(port, () => console.log(`App running on port ${port}`));
};
main();

// // Create account
// const { username, email, password, role } = req.body;

// const prisma = new PrismaClient();

// const User = await prisma.user.create({
//     data: {
//         username: username,
//         email: email,
//         password: password,
//         role: role,
//     },
// });
// res.json(User);

// // Business
// const { business_name, business_number, business_apiKey, business_username } =
//     req.body;

// const Business = await prisma.business.create({
//     data: {
//         business_name: business_name,
//         business_number: business_number,
//         business_apiKey: business,
//         business_username: business_username,
//     },
// });
// res.json(Business);

// // Customer agent
// const { customer_agent_name } = req.body;

// const CustomerAgent = await prisma.customer_agent.create({
//     data: {
//         customer_agent_name: customer_agent_name,
//     },
// });
// res.json(CustomerAgent);
