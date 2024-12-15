const useQueue = <T>() => {
    const queue = new Array<T>(0)

    const push = (element: T) => {
        queue.push(element)
    }

    const pop = () => {
        return queue.shift()
    }

    return {
        push,
        pop
    }
}

type PageFetch = {
    url: string,
    state: "queued" | "fetching" | "cached",
    cacheTimeout: number,
    timestampOfFetch: number,
    htmlDocument: Document | null
}

const usePage = (logging: boolean = false, maxNumberOfConcurrentFetches: number = 5) => {
    const cache = new Map<string, PageFetch>()
    const queue = useQueue<PageFetch>()

    let currentNumberOfConcurrentFetches = 0

    const queuePage = (url: string, cacheTimeout: number = 3600) => {
        const pageCache = cache.get(url)

        if (pageCache) {
            if (logging)
                console.log("queueExistingPage", pageCache)

            if (pageCache.timestampOfFetch + pageCache.cacheTimeout * 1000 > Date.now())
                return
        }

        const page: PageFetch = {
            url: url,
            state: "queued",
            cacheTimeout: cacheTimeout,
            timestampOfFetch: 0,
            htmlDocument: null
        }

        if (logging)
            console.log("queueNewPage", page)

        cache.set(url, page)
        queue.push(page)

        processFetch()
    }

    const processFetch = () => {
        if (currentNumberOfConcurrentFetches >= maxNumberOfConcurrentFetches)
            return

        const pageToFetch = queue.pop()

        if (!pageToFetch) 
            return

        currentNumberOfConcurrentFetches++
        pageToFetch.state = "fetching"
        
        const response = fetch(pageToFetch.url)

        if (logging)
            console.log("fetchPage", pageToFetch)

        response.then(async (res) => {
            pageToFetch.timestampOfFetch = Date.now()

            const pageText = await res.text()

            const parser = new DOMParser()
            const htmlDocument = parser.parseFromString(pageText, 'text/html')

            pageToFetch.htmlDocument = htmlDocument
            pageToFetch.state = "cached"

            currentNumberOfConcurrentFetches--

            if (logging)
                console.log("parsePage", pageToFetch)

            processFetch()
        })
    }

    const getPage = (url: string) => {
        const page = cache.get(url)

        if (logging)
            console.log("getPage", page)

        if (!page)
            return undefined

        if (page.state !== "cached" || !page.htmlDocument)
            return undefined

        return page.htmlDocument
    }

    return {
        queuePage,
        getPage
    }
}

const pageCache = usePage(true)

const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0,
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) 
            return

        const targetElement = entry.target

        const href = targetElement.getAttribute("href")

        if (!href)
            return

        const url = new URL(href, document.baseURI).href

        pageCache.queuePage(url)
    })
}, observerOptions)

function updateDocument(newPage: Document) {
    document.body.innerHTML = ''
    document.body.appendChild(newPage.body.cloneNode(true))

    document.title = newPage.title
}

function goToPage(url: string) {
    const pageInCache = pageCache.getPage(url)

    if (!pageInCache)
        return false

    updateDocument(pageInCache)

    window.scrollTo(0, 0)
    window.history.pushState({}, '', url)

    addLinksObservers()

    return true
}

function anchorClickEvent(event: any) {
    const target = event.currentTarget

    if (!target)
        return

    const href = target.getAttribute("href")
        
    if (!href) 
        return

    const url = new URL(href, document.baseURI).href
    const wasInCache = goToPage(url)

    if (wasInCache) {
        event.preventDefault()
    }
}

function addLinksObservers() {        
    const targetElements = document.getElementsByTagName("a")
    for (let element of targetElements) {
        observer.observe(element)
        element.addEventListener("click", anchorClickEvent)
        element.addEventListener("dblclick", anchorClickEvent)
    }
}

addLinksObservers()