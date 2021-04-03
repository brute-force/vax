'use strict';

const axios = require('axios');
const moment = require('moment');
const minimist = require('minimist');

let args = minimist(process.argv.slice(2), {
    alias: {
      g: 'gender', 
      d: 'dob',
      m: 'distance',
      z: 'zip'
    },
    default: {
      g: 'M',
      d: '1990-01-01',
      m: 50,
      z: '10009'
    }
});

const updateProviders = async (data) => {
  try {
    const res = await axios.post('https://am-i-eligible.covid19vaccine.health.ny.gov/api/get-providers', data);

    return res;
  } catch (err) {
    console.log(err);
  }
};

const filterAvailableByDistance = distanceInMiles => (o) => {
  return Object.values(o).some((address) => parseFloat(address.distanceInMiles) <= distanceInMiles) 
    && o.availableAppointments === 'AA';
};

(async () => {
  const dob = moment(args.d);
  const gender = args.g;
  const zip = args.z;
  const distanceInMiles = args.m;

  try {
    let res = await axios.post('https://am-i-eligible.covid19vaccine.health.ny.gov/api/submit', {
      person : {
        nyresident: 'Y',
        nyworker: 'Y',
        acknowledge: true,
        dob: dob.format('YYYY-MM-DD'),
        gender,
        address : {
          zip
        }
      }
    });

    if (res.data.status === 'denied') {
      console.log('ineligible!');
    } else {
      const applicationId = res.data.applicationId;

      let providers = res.data.providerList.filter(filterAvailableByDistance(distanceInMiles));

      if (providers.length === 0) {
        console.log(`no available appointments within ${distanceInMiles} miles of ${zip}.`);
      } else {
        providers.forEach((provider) => {
          console.log(`${provider.providerName} (${provider.vaccineBrandFullName}), ${provider.address.distanceInMiles} miles away.`);
        });
      }

      // res = await updateProviders({ applicationId, address: zip, dob: dob.format('MM/DD/YYYY') });
  
      // res.data.filter(filterAvailableByDistance(distanceInMiles)).forEach((provider) => {
      //   console.log(provider.providerName, provider.address.distanceInMiles);
      //   console.log(provider['3rdPartyURL'] + '\n');
      // });
      }
  } catch (err) {
    console.log(err);
  }
})();
