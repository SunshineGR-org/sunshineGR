import requests, json

payload = {
    "data":[
        {
            "_id":"b32115fe-74a1-8d57-83b9-1e0e481b98a9",
            "patch": [
                {
                    "op": "REPLACE",
                    "path": "/amount",
                    "value":  799.5
                }
            ]
        }
    ]
}


r = requests.patch(
    'https://api.euc1a1.rockset.com/v1/orgs/self/ws/commons/collections/diavgeia01/docs',
    json=payload,
    headers={'Authorization': 'ApiKey iPzfWRS3b9K6Jx3R39qxOwzZLzficsl7vG8VOaD6VLCqytlHosb7UOVaBbBUfppg'})
print(r.status_code)
print(r)
print(r.reason)
# print(r.json())
