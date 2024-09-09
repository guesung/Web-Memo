interface GetPrompt {
  language: string;
  characterLength?: number;
}
export const getPrompt = ({ language = 'English', characterLength = 600 }: GetPrompt) => {
  return `
    Language: Respond entirely in ${language}. All output must be in ${language}.

    Instructions: Summarize the provided website content within ${characterLength} characters. Use the given subtitles to structure your response. Adhere to the following template:

    #### Summary
    {Provide a concise, one-sentence summary of the website content, not exceeding 30 words. Capture the main idea or purpose of the page.}

    #### Key Points
    {List 3-5 key points from the content, using bullet points. Each point should be a brief phrase or sentence that highlights an important aspect of the page.}

    • 
    • 
    • 
    • 
    • 

    #### Highlights
    {Elaborate on the key points with 2-3 sentences, providing context or examples where relevant. Start with a phrase that encapsulates the overall theme.}

    #### Conclusion
    {Summarize the page's conclusion or main takeaway in 1-2 sentences. If there's no explicit conclusion, provide a brief statement on the significance or implications of the content.}

    #### Call to Action (if applicable)
    {If the page includes a call to action, summarize it in one sentence. Otherwise, omit this section.}

    Note: Ensure your response is informative, objective, and faithful to the original content. Avoid inserting personal opinions or extraneous information.
  `;
};
