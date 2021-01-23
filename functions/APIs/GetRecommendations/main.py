# Python Built-Ins:
import json
import logging
import os

# External Dependencies:
import boto3

dynamodb = boto3.resource("dynamodb")
personalize_runtime = boto3.client("personalize-runtime")
table = dynamodb.Table(os.environ["DDB_TABLE_NAME"])

logger = logging.getLogger()

def handler(event, context):
    campaign_arn = os.environ.get("CAMPAIGN_ARN")

    filter_category_options = list(filter(
        lambda str: str,
        os.environ.get("FILTER_BY_CATEGORY_OPTIONS", "").split("|")
    ))
    filter_specs = [
        { "name": "Buy Again", "arn": os.environ.get("FILTER_BUY_AGAIN_ARN"), "params": [] },
        { "name": "Try Something New", "arn": os.environ.get("FILTER_FRESH_ARN"), "params": [] },
        {
            "name": "By Category",
            "arn": os.environ.get("FILTER_BY_CATEGORY_ARN"),
            "params": [
                {
                    "name": "Category",
                    "id": "CAT",
                    "paramType": filter_category_options if len(filter_category_options) else "string"
                },
            ],
        },
    ]
    
    warnings = []
    response = {
        # Report list of available (ARN-configured) filters, without exposing the ARNs:
        "filtersAvailable": [
            { k: fspec[k] for k in fspec if k != "arn" }
            for fspec in filter(lambda fspec: bool(fspec["arn"]), filter_specs)
        ],
    }
    if campaign_arn:
        try:
            userId = event["pathParameters"]["userid"]
        except:
            userId = "NoUserID"

        query_params = event.get("queryStringParameters", {}) or {}
        filter_name = query_params.get("filter")
        if filter_name:
            try:
                filter_spec = next(filter(lambda fs: fs["name"] == filter_name, filter_specs))
            except StopIteration:
                warnings.append(f"Unrecognised filter '{filter_name}' not configured in back-end.")
                filter_spec = None
        else:
            filter_spec = None
        filter_values = {}
        if (filter_spec is not None) and (len(filter_spec.get("params", [])) > 0):
            filter_values = {}
            for param in filter_spec["params"]:
                try:
                    filter_values[param["id"]] = query_params[param["id"]]
                except:
                    warnings.append(
                        f"Filter '{filter_name}' missing required parameter '{param['name']}' was ignored."
                    )
                    filter_spec = None
                    break

        if filter_spec is None:
            recs = personalize_runtime.get_recommendations(
                campaignArn = campaign_arn,
                userId = userId,
            )
        else:
            recs = personalize_runtime.get_recommendations(
                campaignArn = campaign_arn,
                userId = userId,
                filterArn = filter_spec["arn"],
                filterValues = filter_values,
            )

        itemlist = []
        errcount = 0
        for item in recs["itemList"]:
            itemobj = table.get_item(Key={ "asin": item["itemId"] })
            try:
                itemlist.append(itemobj["Item"])
            except:
                errcount += 1
        response["results"] = itemlist
        if errcount:
            warnings.append(f"{errcount} item IDs missing from DynamoDB")
    else:
        response["results"] = []
        warnings.append((
            "Product recommendations have not yet been enabled: First train a model and deploy a campaign "
            "in Amazon Personalize, then set the CAMPAIGN_ARN environment variable on your "
            "GetRecommendations Lambda function to use the model on the website!"
        ))
        try:
            # May as well try to just present *some* products - we'll take whatever a DynamoDB scan gives us:
            scan = table.scan(Limit=30)
            response["results"] = scan["Items"]
            warnings.append("Results shown here are a simple DynamoDB scan.")
        except:
            response["results"] = []

    if len(warnings):
        response["warning"] = "\n\n".join(warnings)
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Credentials": True,
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(response),
    }
