"use strict";

const request = require('request');
const Datastore = require('@google-cloud/datastore');

const analyse_endpoint = 'http://localhost:5000/analyse';
const datastore = Datastore({projectId: process.env.PROJECT_ID || 'ig-intelligence'});

// load our initial set of posts and userid
const posts = require('./agrim_truncated.json');
const user_id = '293214082';


// post them to igint-analyse for analysis
new Promise((resolve, reject) => request.post({uri: analyse_endpoint, body: posts, json: true}, (err, resp, body) => {
  if (err) {
    reject(err);
  } else if (resp.statusCode >= 400) {
    reject(body);
  } else {
    resolve(body);
  }
}))
  .then(analysed_posts => {
    for (const post of analysed_posts) {
      const key = datastore.key([
        'User',
        user_id,
        'AnalysedPost',
        post.id
      ]);

      const entity = {
        key,
        data: post
      };

      datastore.upsert(entity)
        .then(() => console.log('inserted post ' + post.id));
    }
  });
