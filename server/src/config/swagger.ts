import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TerangaAuto API',
      version: '0.1.0',
      description: 'API REST TerangaAuto avec Express + Mongoose. Documentation générée par swagger-jsdoc.'
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local dev' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/routes/**/*.ts',
    './src/models/**/*.ts',
    './src/openapi/**/*.ts'
  ]
});
