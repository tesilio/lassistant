/**
 * webHook 핸들러
 * @returns {Promise<{statusCode: number}>}
 */
import { APIGatewayProxyResult } from 'aws-lambda';

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
