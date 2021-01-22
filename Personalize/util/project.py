# Python Built-Ins:
import logging
from types import SimpleNamespace

# External Dependencies:
import boto3

logger = logging.getLogger("project")

ssm = boto3.client("ssm")

def get_config(project_name: str) -> SimpleNamespace:
    """Retrieve configuration parameters for the current `project_name` from AWS SSM"""

    ssm_param_map = {  # SSM basename to Python config object field name
        "StagingBucket": "staging_bucket",
        "GetRecommendationsLambdaArn": "getrecs_lambda_arn",
        "GetRecommendationsByItemLambdaArn": "getitemrecs_lambda_arn",
        "SearchRerankLambdaArn": "rerank_lambda_arn",
        "PostClickEventLambdaArn": "events_lambda_arn",
    }

    ssm_prefix = f"/{project_name}/"
    response = ssm.get_parameters(Names=[ssm_prefix + s for s in ssm_param_map])
    n_invalid = len(response.get("InvalidParameters", []))
    if n_invalid == len(ssm_param_map):
        raise ValueError(f"Found no valid SSM parameters for {ssm_prefix}*: Invalid project name")
    elif n_invalid > 0:
        logger.warning(" ".join([
            f"{n_invalid} Project parameters missing from SSM: Some functionality may not work as",
            f"expected. Missing: {response['InvalidParameters']}"
        ]))

    config_map = {}  # Python config object field name to value
    for param in response["Parameters"]:
        param_basename = param["Name"][len(ssm_prefix):]
        config_map[ssm_param_map[param_basename]] = param["Value"]

    return SimpleNamespace(**config_map)
