"use strict";

const path = require('path');

const debug = require('debug')('igint-endpoints:main');
const express = require('express');
const logger = require('morgan');
const Datastore = require('@google-cloud/datastore');
const request = require('request');
const ig_profile_scraper = require('instagram-scrape-account-stats');

const app = express();
app.use(logger('dev'));
const datastore = Datastore({projectId: process.env.PROJECT_ID || 'ig-intelligence'});

app.use(express.static(path.join(__dirname, 'static')));

app.get('/intel/:username', (req, res) => {
  const username = req.params.username;

  let user_id;
  // 1. check if the username exists and get its userid
  ig_profile_scraper.getAccountStats({username})
    .then(account => {
      user_id = account.userId
    })

    // 2. look up the latest post in the datastore for userid
    .then(() => {
      debug('looking up datastore for latest post');

      const ancestor_key = datastore.key(['User', user_id]);
      const query = datastore.createQuery('AnalysedPost')
        .order('timestamp', {descending: true})
        .limit(1)
        .hasAncestor(ancestor_key);

      return datastore.runQuery(query);
    })

    // 3. send a request to igint-scrape for the new posts
    .then(entities => {
      debug('scraping for new posts');

      const options = {
        uri: process.env.IGINT_SCRAPE_ENDPOINT || 'http://localhost:3000/' + username
      };

      if (entities[0].length !== 0) {
        options.headers = {
          'If-Range': new Date(entities[0][0].timestamp).toUTCString()
        };
      }

      return new Promise((resolve, reject) => request.get(options, (err, resp, body) => {
        if (err) {
          return reject(err);
        } else if (resp.statusCode >= 400) {
          return reject(JSON.parse(body));
        } else {
          return resolve(JSON.parse(body));
        }
      }));
    })
    // 4. send the new posts to igint-analyse for the analysis
    .then(new_posts => {
      if (new_posts.length > 0) {
        return new Promise((resolve, reject) => request.post({
            uri: process.env.IGINT_ANALYSE_ENDPOINT || 'http://localhost:5000/analyse',
            body: new_posts,
            json: true
          }, (err, resp, body) => {
            if (err) {
              return reject(err);
            } else if (resp.statusCode >= 400) {
              return reject(body);
            } else {
              return resolve(body);
            }
          })
        )
        // 5. save the analysis results into cloud datastore
          .then(analysed_posts => {
            debug('saving analysed posts to datastore');

            const upserts = [];
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

              upserts.push(datastore.upsert(entity));
            }

            return Promise.all(upserts);
          });
      }
    })


    // 6. fetch all analysed_posts from datastore
    .then(() => {
      const ancestorKey = datastore.key(['User', user_id]);

      const query = datastore.createQuery('AnalysedPost')
        .hasAncestor(ancestorKey);

      return datastore.runQuery(query);
    })

    // 7. send posts to igint-insights for insights
    .then(entities => new Promise((resolve, reject) => request.post({
      uri: process.env.IGINT_INSIGHTS_ENDPOINT || 'http://localhost:4000/insights/' + user_id,
      body: entities[0],
      json: true
    }, (err, resp, body) => {
      if (err) {
        return reject(err);
      } else if (resp.statusCode >= 400) {
        return reject(body);
      } else {
        return resolve(body);
      }
    })))

    // 7. return insights to user
    .then(insights => res.json(insights))

    // error handling
    .catch(err => {
      if (err.statusCode || err.statusCode === 404) {
        return res.sendStatus(404);
      } else {
        debug(err);
        return res.sendStatus(500);
      }
    });
});

app.get('/version', (req, res) => res.send(require('./package.json').version));

const port = process.env.PORT || 3500;

app.listen(port, () => {
  debug(`Listening on port ${port}.`);
});