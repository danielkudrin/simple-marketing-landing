const credentials = require('./credentials.example.js')

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const axios = require('axios');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport(
  credentials.mainTransporterCredentials
);

const mailchimp = require('@mailchimp/mailchimp_marketing');

const emailTemplate = require('./emailTemplate');
const command = require('./command');

admin.initializeApp();
const db = admin.firestore();

mailchimp.setConfig({
  apiKey: credentials.mailchimp.apiKey,
  server: credentials.mailchimp.server,
});

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  const geo = { country: '', city: '' }; // TODO

  const addCollection = async () => {
    await db.collection('emails').add({
      email: req.body.email || '',
      message: req.body.message || '',
      type: req.body.type || '',
      ip: req.ip || '',
      country: geo.country || '',
      city: geo.city || '',
      utm_source: req.body.utm_source || '',
      utm_medium: req.body.utm_medium || '',
      utm_campaign: req.body.utm_campaign || '',
      utm_content: req.body.utm_content || '',
      utm_term: req.body.utm_term || '',
    });
  };

  const domain = 'foo';
  let target = 'foo@example.com';
  let subject = 'Новое сообщение';

  const mailOptions = {
    from: `${domain}<${req.body.email}>`,
    to: `${target}, hardcodedemail@example.com`,
    replyTo: `${req.body.email}`,
    subject: `${domain} || ${subject} от ${req.body.email}`,
    html: `
            <h2>Сайт: ${domain}</h2>
            <h2>Отправлено из ${req.body.type || ''}</h2>
            <h3>Отправитель</h3>
            Е-маил: ${req.body.email}<br />
            Сообщение: ${req.body.message}<br />
            ------------
            ------------
            <h3>Utm Tags</h3>
            utm_source: ${req.body.utm_source}<br />
            utm_medium: ${req.body.utm_medium}<br />
            utm_campaign: ${req.body.utm_campaign}<br />
            utm_content: ${req.body.utm_content}<br />
            utm_term: ${req.body.utm_term}<br />
        `,
  };

  axios
    .post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${
        credentials.recaptchaSecret
      }&response=${req.body.token}`,
      {}
    )
    .then((response) => {
      if (response.data.success) {
        return transporter.sendMail(mailOptions, async (err) => {
          if (err) {
            return res.send(err);
          }
          addCollection();
          return res.send('Email sent successfully');
        });
      } else {
        return res.send('Recaptcha verification failed.');
      }
    });
});

exports.subscribeToMailchimp = functions.firestore
  .document('emails/{docId}')
  .onCreate(async (snap, context) => {
    let params = snap.data();

    const listId = credentials.mailchimp.listId;
    await mailchimp.lists.addListMember(listId, {
      email_address: params.email,
      status: 'subscribed',
      merge_fields: {},
    });
  });

exports.welcomeMessage = functions.firestore
  .document('emails/{docId}')
  .onCreate(async (snap, context) => {
    const params = snap.data();

    const gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: credentials.gmailWelcomeTransporter.user,
        pass: credentials.gmailWelcomeTransporter.password,
      },
    });

    const mailOptions = {
      from: `Foobar <foobar@example.com>`,
      to: params.email,
      subject: 'FoobarTitle',
      html: emailTemplate.template,
      attachments: [
        {
          filename: 'foobar.xlsx',
          path: 'foobarLink.com',
        },
        {
          filename: 'foobar1.pdf',
          path: 'foobarLink.com',
        },
        {
          filename: 'foobar2.pdf',
          path: 'foobarLink.com',
        },
      ],
    };

    await gmailTransporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.log('Welcome message failed', err);
      } else {
        console.log('Welcome message sent succesfully.');
      }
    });
  });

exports.addToCrm = functions.firestore
  .document('emails/{docId}')
  .onCreate(async (snap, context) => {
    let params = snap.data();

    let docRef = db.collection('private').doc('foobarConfig');
    let doc = await docRef.get();
    if (doc.exists) {
      ({ clientId, clientSecret, refreshToken } = doc.data());
    }

    if (clientId == null || clientSecret == null || refreshToken == null) {
      throw new Error('Cannot find config');
    }

    let accessToken = '';
    // TODO pass all data to crm
    let email = params.email;

    ({ refreshToken, accessToken } = await command.getApiKey(
      clientId,
      clientSecret,
      refreshToken
    ));

    // Store updated refreshToken
    docRef.update({
      refreshToken: refreshToken,
    });

    let contactId = await command.getContactId(email, accessToken);

    if (!contactId) {
      contactId = await command.createContact(email, accessToken);
    }

    await command.addToPipeline(params, contactId, accessToken);
  });
