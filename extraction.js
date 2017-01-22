"use strict";

const Datastore = require('@google-cloud/datastore');
const datastore = Datastore({projectId: process.env.PROJECT_ID || 'ig-intelligence'});

const user_id = '11830955';

const ancestorKey = datastore.key(['User', user_id]);

const query = datastore.createQuery('AnalysedPost')
  .hasAncestor(ancestorKey);

datastore.runQuery(query)
  .then(entities => {
    console.log(JSON.stringify(entities));
  });
