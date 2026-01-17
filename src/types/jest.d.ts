// This file provides type definitions for Jest
import '@types/jest';

declare global {
  namespace NodeJS {
    interface Global {
      beforeAll: typeof beforeAll;
      afterAll: typeof afterAll;
      describe: typeof describe;
      it: typeof it;
      expect: typeof expect;
    }
  }
}

declare const beforeAll: jest.Lifecycle;
declare const afterAll: jest.Lifecycle;
declare const describe: jest.Describe;
declare const it: jest.It;
declare const expect: jest.Expect;
