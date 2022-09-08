const { simulateContract } = require('@three-em/node-darwin-arm64');
require('isomorphic-fetch');

const postRequest = (url, body) => {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

const buildGqlQuery = (functionId) => {
    const query = `query {
              transactions(
                tags: [{ name: "Function", values: ["${functionId}"] }]
                sort: HEIGHT_DESC
                first: 100,
              ) {
                edges {
                  node {
                    id
                    owner {
                      address
                    }
                    block {
                      height
                    }
                    tags {
                      name
                      value
                    }
                  }
                  cursor
                }
                pageInfo {
                  hasNextPage
                }
              }
            }`;
    return {
        query,
        variables: {}
    }
}

const fetchTxs = async (functionId) => {
    const req = await postRequest(`https://arweave.net/graphql`, buildGqlQuery(functionId));
    const jsonResp = await req.json();
    return jsonResp.data.transactions.edges.map((i) => i.node);
}

const executeExmSmartweaveHybrid = async (functionId) => {
    const txs = await fetchTxs(functionId);
    const inputs = [];
    for(let tx of txs) {
        const { tags, id } = tx;
        const isSmartWeave = tags.find((i) => i.name === 'App-Name' && i.value === 'SmartWeaveAction');
        if(isSmartWeave) {
            let input = tags.find((i) => i.name === 'Input')?.value;
            inputs.push({
                id,
                owner: tx.owner.address,
                quantity: "0",
                reward: "0",
                tags,
                input
            });
        } else {
            const bundleData = await fetch(`https://arweave.net/${id}`);
            const bundleDataJson = await bundleData.json();
            inputs.push(...(bundleDataJson.entities.map((i) => i.raw)));
        }
    }

    return simulateContract({
        contractId: functionId,
        interactions: inputs,
        contractInitState: JSON.stringify({ users: [] }),
        maybeConfig: undefined,
        maybeCache: false,
    })
}

(async () => {
    const { state } = await executeExmSmartweaveHybrid("ZYBt3aHlPhSBdJK5e4UcA_922UvYcDf5BrixXzM40lA");
    console.log(state);
})();
// {
//   users: [
//     { username: 'Andres from EXM' },
//     { username: 'Andres from SmartWeave' }
//   ]
// }