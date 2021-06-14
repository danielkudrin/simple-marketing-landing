const api = require('./api');

const domainUrl = 'qwerty.amocrm.ru';
const adminId = 6155939;
const fieldsId = {
  utm_source: 360237,
  utm_medium: 361839,
  utm_campaign: 360821,
  utm_content: 366843,
  utm_term: 360745,
};
const emailId = 1025;
const contactMessageTitle = 'Foo';

exports.getApiKey = async (clientId, clientSecret, refreshToken) => {
  let data = {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: 'https://nds-centr.net',
    grant_type: 'refresh_token',
  };

  let res = await api.post(`https://${domainUrl}/oauth2/access_token`, data);
  return {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
  };
};

exports.getContactId = async (email, accessToken) => {
  let url = `https://${domainUrl}/api/v2/contacts/?query=${email}`;

  let res = await api.get(url, accessToken);

  let clientId = null;
  if (res.data._embedded && res.data._embedded.items) {
    let items = res.data._embedded.items;
    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < items[i].custom_fields.length; j++) {
        if (items[i].custom_fields[j].code === 'EMAIL') {
          clientId = items[i].id;
          break;
        }
      }
      if (clientId !== null) {
        break;
      }
    }
  }

  return clientId;
};

exports.createContact = async (email, accessToken) => {
  let data = {
    add: [
      {
        name: email,
        responsible_user_id: adminId,
        created_by: adminId,
        custom_fields: [
          {
            id: emailId,
            values: [
              {
                value: email,
                enum: 'WORK',
              },
            ],
          },
        ],
      },
    ],
  };

  let res = await api.post(
    `https://${domainUrl}/api/v2/contacts`,
    data,
    accessToken
  );

  return res.data._embedded.items[0].id;
};

exports.addToPipeline = async (params, contactId, accessToken) => {
  let [maxYear, maxQuar, pipelineId, lastPipeline] = [
    false,
    false,
    false,
    false,
  ];

  let res = await api.get(`https://${domainUrl}/api/v2/pipelines`, accessToken);
  let pipelines = res.data._embedded.items;

  for (let pid in pipelines) {
    //One pipeline
    let statuses = pipelines[pid];
    let [quar, year] = statuses.name.split('-');
    // If starts with T
    if (quar[0] == 'Т') {
      //If next year, then reset Quarter count
      if (!maxYear || maxYear < year) {
        maxYear = year;
        maxQuar = false;
      }
      if (!maxQuar || maxQuar < quar) {
        maxQuar = quar;
        pipelineId = pid;
        lastPipeline = statuses;
      }
    }
    //If has Y and already at latest pipeline
    if (quar[0] == 'У' && maxYear && maxQuar) {
      pipelineId = pid;
      lastPipeline = statuses;
    }
  }

  if (pipelineId) {
    let statusId = false;
    for (let sid in lastPipeline.statuses) {
      let name = lastPipeline.statuses[sid].name;
      if (name.toLowerCase() == 'необработанное') {
        statusId = sid;
        break;
      }
    }

    if (statusId) {
      let data = {
        add: [
          {
            name: `${contactMessageTitle} || Новое сообщение от ${params.email}`,
            status_id: statusId,
            pipeline_id: pipelineId,
            responsible_user_id: adminId,
            contacts_id: [contactId],
            custom_fields: [
              {
                id: fieldsId.utm_source,
                values: [{ value: params.utm_source }],
              },
              {
                id: fieldsId.utm_medium,
                values: [{ value: params.utm_medium }],
              },
              {
                id: fieldsId.utm_campaign,
                values: [{ value: params.utm_campaign }],
              },
              {
                id: fieldsId.utm_content,
                values: [{ value: params.utm_content }],
              },
              {
                id: fieldsId.utm_term,
                values: [{ value: params.utm_term }],
              },
            ],
          },
        ],
      };

      let res = await api.post(
        `https://${domainUrl}/api/v2/leads`,
        data,
        accessToken
      );

      return res.data;
    }
  }
};
