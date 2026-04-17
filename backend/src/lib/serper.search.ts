/* eslint-disable @typescript-eslint/no-explicit-any */
import TurndownService from 'turndown'

const turndown = new TurndownService().addRule('notLink', {
    filter: ['a'],
    replacement: function () { 
        return ''; 
    },
})
turndown.remove(['script', 'meta', 'style', 'link', 'head', 'a']);

export const search = async (query: string) => {
    const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.SERPER_API_KEY,
        },
        body: JSON.stringify({
            q: query,
            gl: "cn",
            hl: "zh-cn",
        }),
    })

    const data: any = await response.json()

    let searchResult = ''

    if (data.answerBox) {
        searchResult += `${data.answerBox.snippet}\n\n${data.answerBox.snippetHighlighted?.join('\n')}\n\n`; 
    }

    if (data.organic) {
        data.organic.forEach((result: any) => {
            searchResult += `## ${result.title}\n${result.snippet}\n\n`;
        });
    }

    if (query.includes('site:')) {
        let url = query.split('site:')[1];
        if (!/^http(s)?:\/\//.test(url)) {
            url = 'https://' + url.replace(/^\/\//, '');
        }
        const response = await fetch(url);
        const content = turndown.turndown(await response.text());
        if (content) {
            searchResult += `##原文\n\n${content}\n\n`;
        }
    }

    return { query, result: searchResult };
}