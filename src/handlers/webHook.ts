import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * webHook 핸들러
 * @returns {Promise<{statusCode: number}>}
 */
exports.handler = async (
  event: APIGatewayProxyResult,
): Promise<{
  statusCode: number;
}> => {
  console.log(JSON.stringify(event));
  return {
    statusCode: 200,
  };
};
