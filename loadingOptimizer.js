var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var useQueue = function () {
    var queue = new Array(0);
    var push = function (element) {
        queue.push(element);
    };
    var pop = function () {
        return queue.shift();
    };
    return {
        push: push,
        pop: pop
    };
};
var usePage = function (logging, maxNumberOfConcurrentFetches) {
    if (logging === void 0) { logging = false; }
    if (maxNumberOfConcurrentFetches === void 0) { maxNumberOfConcurrentFetches = 5; }
    var cache = new Map();
    var queue = useQueue();
    var currentNumberOfConcurrentFetches = 0;
    var queuePage = function (url, cacheTimeout) {
        if (cacheTimeout === void 0) { cacheTimeout = 3600; }
        var pageCache = cache.get(url);
        if (pageCache) {
            if (logging)
                console.log("queueExistingPage", pageCache);
            if (pageCache.timestampOfFetch + pageCache.cacheTimeout * 1000 > Date.now())
                return;
        }
        var page = {
            url: url,
            state: "queued",
            cacheTimeout: cacheTimeout,
            timestampOfFetch: 0,
            htmlDocument: null
        };
        if (logging)
            console.log("queueNewPage", page);
        cache.set(url, page);
        queue.push(page);
        processFetch();
    };
    var processFetch = function () {
        if (currentNumberOfConcurrentFetches >= maxNumberOfConcurrentFetches)
            return;
        var pageToFetch = queue.pop();
        if (!pageToFetch)
            return;
        currentNumberOfConcurrentFetches++;
        pageToFetch.state = "fetching";
        var response = fetch(pageToFetch.url);
        if (logging)
            console.log("fetchPage", pageToFetch);
        response.then(function (res) { return __awaiter(_this, void 0, void 0, function () {
            var pageText, parser, htmlDocument;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pageToFetch.timestampOfFetch = Date.now();
                        return [4 /*yield*/, res.text()];
                    case 1:
                        pageText = _a.sent();
                        parser = new DOMParser();
                        htmlDocument = parser.parseFromString(pageText, 'text/html');
                        pageToFetch.htmlDocument = htmlDocument;
                        pageToFetch.state = "cached";
                        currentNumberOfConcurrentFetches--;
                        if (logging)
                            console.log("parsePage", pageToFetch);
                        processFetch();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    var getPage = function (url) {
        var page = cache.get(url);
        if (logging)
            console.log("getPage", page);
        if (!page)
            return undefined;
        if (page.state !== "cached" || !page.htmlDocument)
            return undefined;
        return page.htmlDocument;
    };
    return {
        queuePage: queuePage,
        getPage: getPage
    };
};
var pageCache = usePage(true);
var observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0,
};
var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (!entry.isIntersecting)
            return;
        var targetElement = entry.target;
        var href = targetElement.getAttribute("href");
        if (!href)
            return;
        var url = new URL(href, document.baseURI).href;
        pageCache.queuePage(url);
    });
}, observerOptions);
function updateDocument(newPage) {
    document.body.innerHTML = '';
    document.body.appendChild(newPage.body.cloneNode(true));
    document.title = newPage.title;
}
function goToPage(url) {
    var pageInCache = pageCache.getPage(url);
    if (!pageInCache)
        return false;
    updateDocument(pageInCache);
    window.scrollTo(0, 0);
    window.history.pushState({}, '', url);
    addLinksObservers();
    return true;
}
function anchorClickEvent(event) {
    var target = event.currentTarget;
    if (!target)
        return;
    var href = target.getAttribute("href");
    if (!href)
        return;
    var url = new URL(href, document.baseURI).href;
    var wasInCache = goToPage(url);
    if (wasInCache) {
        event.preventDefault();
    }
}
function addLinksObservers() {
    var targetElements = document.getElementsByTagName("a");
    for (var _i = 0, targetElements_1 = targetElements; _i < targetElements_1.length; _i++) {
        var element = targetElements_1[_i];
        observer.observe(element);
        element.addEventListener("click", anchorClickEvent);
        element.addEventListener("dblclick", anchorClickEvent);
    }
}
addLinksObservers();
