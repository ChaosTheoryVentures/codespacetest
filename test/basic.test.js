// Basic test to ensure the test runner works
describe('Neural Network Playground', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('should have correct package name', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('neural-network-playground-server');
  });
  
  test('should have main entry point', () => {
    const packageJson = require('../package.json');
    expect(packageJson.main).toBe('server.js');
  });
});