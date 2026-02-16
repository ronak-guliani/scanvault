"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...all]/route";
exports.ids = ["app/api/auth/[...all]/route"];
exports.modules = {

/***/ "./action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "./request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "./static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...all%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...all%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...all%5D%2Froute.ts&appDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...all%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...all%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...all%5D%2Froute.ts&appDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/../../node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_ronakguliani_code_scanvault_apps_web_app_api_auth_all_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/[...all]/route.ts */ \"(rsc)/./app/api/auth/[...all]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...all]/route\",\n        pathname: \"/api/auth/[...all]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...all]/route\"\n    },\n    resolvedPagePath: \"/Users/ronakguliani/code/scanvault/apps/web/app/api/auth/[...all]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_ronakguliani_code_scanvault_apps_web_app_api_auth_all_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/[...all]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyLmpzP25hbWU9YXBwJTJGYXBpJTJGYXV0aCUyRiU1Qi4uLmFsbCU1RCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGYXV0aCUyRiU1Qi4uLmFsbCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5hbGwlNUQlMkZyb3V0ZS50cyZhcHBEaXI9JTJGVXNlcnMlMkZyb25ha2d1bGlhbmklMkZjb2RlJTJGc2NhbnZhdWx0JTJGYXBwcyUyRndlYiUyRmFwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9JTJGVXNlcnMlMkZyb25ha2d1bGlhbmklMkZjb2RlJTJGc2NhbnZhdWx0JTJGYXBwcyUyRndlYiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDMEI7QUFDdkc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9Ac2NhbnZhdWx0L3dlYi8/MDUxNSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvcm9uYWtndWxpYW5pL2NvZGUvc2NhbnZhdWx0L2FwcHMvd2ViL2FwcC9hcGkvYXV0aC9bLi4uYWxsXS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvYXV0aC9bLi4uYWxsXS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvWy4uLmFsbF1cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvWy4uLmFsbF0vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvcm9uYWtndWxpYW5pL2NvZGUvc2NhbnZhdWx0L2FwcHMvd2ViL2FwcC9hcGkvYXV0aC9bLi4uYWxsXS9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvYXV0aC9bLi4uYWxsXS9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBvcmlnaW5hbFBhdGhuYW1lLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...all%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...all%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...all%5D%2Froute.ts&appDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/[...all]/route.ts":
/*!****************************************!*\
  !*** ./app/api/auth/[...all]/route.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./src/lib/auth.ts\");\n/* harmony import */ var better_auth_next_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! better-auth/next-js */ \"(rsc)/../../node_modules/better-auth/dist/integrations/next-js.mjs\");\n\n\nconst { GET, POST } = (0,better_auth_next_js__WEBPACK_IMPORTED_MODULE_1__.toNextJsHandler)(_lib_auth__WEBPACK_IMPORTED_MODULE_0__.auth);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLmFsbF0vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFrQztBQUNvQjtBQUUvQyxNQUFNLEVBQUVFLEdBQUcsRUFBRUMsSUFBSSxFQUFFLEdBQUdGLG9FQUFlQSxDQUFDRCwyQ0FBSUEsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL0BzY2FudmF1bHQvd2ViLy4vYXBwL2FwaS9hdXRoL1suLi5hbGxdL3JvdXRlLnRzP2QyMGEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXV0aCB9IGZyb20gXCJAL2xpYi9hdXRoXCI7XG5pbXBvcnQgeyB0b05leHRKc0hhbmRsZXIgfSBmcm9tIFwiYmV0dGVyLWF1dGgvbmV4dC1qc1wiO1xuXG5leHBvcnQgY29uc3QgeyBHRVQsIFBPU1QgfSA9IHRvTmV4dEpzSGFuZGxlcihhdXRoKTtcbiJdLCJuYW1lcyI6WyJhdXRoIiwidG9OZXh0SnNIYW5kbGVyIiwiR0VUIiwiUE9TVCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...all]/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/auth.ts":
/*!*************************!*\
  !*** ./src/lib/auth.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth)\n/* harmony export */ });\n/* harmony import */ var better_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! better-auth */ \"(rsc)/../../node_modules/better-auth/dist/index.mjs\");\n/* harmony import */ var better_auth_next_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! better-auth/next-js */ \"(rsc)/../../node_modules/better-auth/dist/integrations/next-js.mjs\");\n\n\nconst auth = (0,better_auth__WEBPACK_IMPORTED_MODULE_0__.betterAuth)({\n    secret: process.env.BETTER_AUTH_SECRET,\n    baseURL: process.env.BETTER_AUTH_URL ?? \"http://localhost:3000\",\n    socialProviders: {\n        microsoft: {\n            clientId: process.env.MICROSOFT_CLIENT_ID,\n            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,\n            tenantId: process.env.MICROSOFT_TENANT_ID ?? \"common\",\n            prompt: \"select_account\"\n        },\n        ...process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {\n            google: {\n                clientId: process.env.GOOGLE_CLIENT_ID,\n                clientSecret: process.env.GOOGLE_CLIENT_SECRET,\n                prompt: \"select_account\"\n            }\n        } : {}\n    },\n    account: {\n        storeStateStrategy: \"cookie\",\n        storeAccountCookie: true\n    },\n    session: {\n        cookieCache: {\n            enabled: true,\n            maxAge: 7 * 24 * 60 * 60,\n            strategy: \"jwt\",\n            refreshCache: true\n        }\n    },\n    plugins: [\n        (0,better_auth_next_js__WEBPACK_IMPORTED_MODULE_1__.nextCookies)()\n    ]\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL2F1dGgudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQXlDO0FBQ1M7QUFFM0MsTUFBTUUsT0FBT0YsdURBQVVBLENBQUM7SUFDN0JHLFFBQVFDLFFBQVFDLEdBQUcsQ0FBQ0Msa0JBQWtCO0lBQ3RDQyxTQUFTSCxRQUFRQyxHQUFHLENBQUNHLGVBQWUsSUFBSTtJQUN4Q0MsaUJBQWlCO1FBQ2ZDLFdBQVc7WUFDVEMsVUFBVVAsUUFBUUMsR0FBRyxDQUFDTyxtQkFBbUI7WUFDekNDLGNBQWNULFFBQVFDLEdBQUcsQ0FBQ1MsdUJBQXVCO1lBQ2pEQyxVQUFVWCxRQUFRQyxHQUFHLENBQUNXLG1CQUFtQixJQUFJO1lBQzdDQyxRQUFRO1FBQ1Y7UUFDQSxHQUFJYixRQUFRQyxHQUFHLENBQUNhLGdCQUFnQixJQUFJZCxRQUFRQyxHQUFHLENBQUNjLG9CQUFvQixHQUNoRTtZQUNFQyxRQUFRO2dCQUNOVCxVQUFVUCxRQUFRQyxHQUFHLENBQUNhLGdCQUFnQjtnQkFDdENMLGNBQWNULFFBQVFDLEdBQUcsQ0FBQ2Msb0JBQW9CO2dCQUM5Q0YsUUFBUTtZQUNWO1FBQ0YsSUFDQSxDQUFDLENBQUM7SUFDUjtJQUNBSSxTQUFTO1FBQ1BDLG9CQUFvQjtRQUNwQkMsb0JBQW9CO0lBQ3RCO0lBQ0FDLFNBQVM7UUFDUEMsYUFBYTtZQUNYQyxTQUFTO1lBQ1RDLFFBQVEsSUFBSSxLQUFLLEtBQUs7WUFDdEJDLFVBQVU7WUFDVkMsY0FBYztRQUNoQjtJQUNGO0lBQ0FDLFNBQVM7UUFBQzdCLGdFQUFXQTtLQUFHO0FBQzFCLEdBQUciLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9Ac2NhbnZhdWx0L3dlYi8uL3NyYy9saWIvYXV0aC50cz82NjkyIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGJldHRlckF1dGggfSBmcm9tIFwiYmV0dGVyLWF1dGhcIjtcbmltcG9ydCB7IG5leHRDb29raWVzIH0gZnJvbSBcImJldHRlci1hdXRoL25leHQtanNcIjtcblxuZXhwb3J0IGNvbnN0IGF1dGggPSBiZXR0ZXJBdXRoKHtcbiAgc2VjcmV0OiBwcm9jZXNzLmVudi5CRVRURVJfQVVUSF9TRUNSRVQsXG4gIGJhc2VVUkw6IHByb2Nlc3MuZW52LkJFVFRFUl9BVVRIX1VSTCA/PyBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMFwiLFxuICBzb2NpYWxQcm92aWRlcnM6IHtcbiAgICBtaWNyb3NvZnQ6IHtcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5NSUNST1NPRlRfQ0xJRU5UX0lEIGFzIHN0cmluZyxcbiAgICAgIGNsaWVudFNlY3JldDogcHJvY2Vzcy5lbnYuTUlDUk9TT0ZUX0NMSUVOVF9TRUNSRVQgYXMgc3RyaW5nLFxuICAgICAgdGVuYW50SWQ6IHByb2Nlc3MuZW52Lk1JQ1JPU09GVF9URU5BTlRfSUQgPz8gXCJjb21tb25cIixcbiAgICAgIHByb21wdDogXCJzZWxlY3RfYWNjb3VudFwiLFxuICAgIH0sXG4gICAgLi4uKHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfSUQgJiYgcHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9TRUNSRVRcbiAgICAgID8ge1xuICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfSUQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgY2xpZW50U2VjcmV0OiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX1NFQ1JFVCBhcyBzdHJpbmcsXG4gICAgICAgICAgICBwcm9tcHQ6IFwic2VsZWN0X2FjY291bnRcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICA6IHt9KSxcbiAgfSxcbiAgYWNjb3VudDoge1xuICAgIHN0b3JlU3RhdGVTdHJhdGVneTogXCJjb29raWVcIiBhcyBjb25zdCxcbiAgICBzdG9yZUFjY291bnRDb29raWU6IHRydWUsXG4gIH0sXG4gIHNlc3Npb246IHtcbiAgICBjb29raWVDYWNoZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIG1heEFnZTogNyAqIDI0ICogNjAgKiA2MCxcbiAgICAgIHN0cmF0ZWd5OiBcImp3dFwiLFxuICAgICAgcmVmcmVzaENhY2hlOiB0cnVlLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtuZXh0Q29va2llcygpXSxcbn0pO1xuIl0sIm5hbWVzIjpbImJldHRlckF1dGgiLCJuZXh0Q29va2llcyIsImF1dGgiLCJzZWNyZXQiLCJwcm9jZXNzIiwiZW52IiwiQkVUVEVSX0FVVEhfU0VDUkVUIiwiYmFzZVVSTCIsIkJFVFRFUl9BVVRIX1VSTCIsInNvY2lhbFByb3ZpZGVycyIsIm1pY3Jvc29mdCIsImNsaWVudElkIiwiTUlDUk9TT0ZUX0NMSUVOVF9JRCIsImNsaWVudFNlY3JldCIsIk1JQ1JPU09GVF9DTElFTlRfU0VDUkVUIiwidGVuYW50SWQiLCJNSUNST1NPRlRfVEVOQU5UX0lEIiwicHJvbXB0IiwiR09PR0xFX0NMSUVOVF9JRCIsIkdPT0dMRV9DTElFTlRfU0VDUkVUIiwiZ29vZ2xlIiwiYWNjb3VudCIsInN0b3JlU3RhdGVTdHJhdGVneSIsInN0b3JlQWNjb3VudENvb2tpZSIsInNlc3Npb24iLCJjb29raWVDYWNoZSIsImVuYWJsZWQiLCJtYXhBZ2UiLCJzdHJhdGVneSIsInJlZnJlc2hDYWNoZSIsInBsdWdpbnMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/auth.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/better-auth","vendor-chunks/next","vendor-chunks/@better-fetch","vendor-chunks/@better-auth","vendor-chunks/defu","vendor-chunks/kysely","vendor-chunks/@noble","vendor-chunks/rou3"], () => (__webpack_exec__("(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...all%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...all%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...all%5D%2Froute.ts&appDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronakguliani%2Fcode%2Fscanvault%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();