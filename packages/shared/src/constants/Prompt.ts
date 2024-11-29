export const DEFAULT_PROMPTS = {
  youtube: `
    Instructions: Summarize the provided YouTube video content. Follow this template:

    #### Summary
    {Provide a concise summary of the video's main topic or purpose in 1-2 sentences}

    #### Key Points
    {List 3-5 key points from the video using bullet points}

    #### Timeline Highlights
    {Note 2-3 significant moments/sections from the video with timestamps}

    #### Main Takeaways
    {Summarize the key lessons or conclusions in 2-3 sentences}

    Note: Keep the response clear, factual and focused on the video content.
  `,
  web: `
    Instructions: Summarize the provided website content. Follow this template:

    #### Summary
    {Provide a concise summary of the page's main topic in 1-2 sentences}

    #### Key Points
    {List 3-5 key points from the content using bullet points}

    #### Details
    {Elaborate on 2-3 most important aspects with brief explanations}

    #### Conclusion
    {Summarize the main takeaways or conclusions in 1-2 sentences}

    Note: Keep the response clear, factual and focused on the page content.
  `,
};

export const PROMPT = {
  language: 'Language: Respond entirely in',
};
