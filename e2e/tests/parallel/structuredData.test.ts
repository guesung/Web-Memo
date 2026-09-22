import { expect, test } from "@playwright/test";

test.describe("소개 페이지 구조화 데이터", () => {
	for (const language of ["ko", "en"]) {
		test(`${language} FAQ와 사용 단계가 화면 문구와 일치한다.`, async ({
			page,
		}) => {
			const response = await page.goto(`/${language}/introduce`);
			expect(response?.status()).toBe(200);

			const faqScript = page.locator("script#faq-jsonld");
			await expect(faqScript).toHaveCount(1);
			const faqSchema: IFFaqSchema = JSON.parse(
				(await faqScript.textContent()) ?? "",
			);
			expect(faqSchema["@type"]).toBe("FAQPage");
			expect(faqSchema.mainEntity).toHaveLength(7);

			const faqSection = page.locator("section").filter({ has: faqScript });
			const faqTriggers = faqSection.getByRole("button", { expanded: false });
			await expect(faqTriggers).toHaveCount(7);

			for (const question of faqSchema.mainEntity) {
				expect(question["@type"]).toBe("Question");
				expect(question.acceptedAnswer["@type"]).toBe("Answer");
				expect(question.name.trim()).not.toBe("");
				expect(question.acceptedAnswer.text.trim()).not.toBe("");

				const trigger = faqSection.getByRole("button", {
					name: question.name,
					exact: true,
				});
				await trigger.click();
				await expect(trigger).toHaveAttribute("aria-expanded", "true");
				const answer = faqSection.getByRole("region", {
					name: question.name,
					exact: true,
				});
				await expect(answer).toBeVisible();
				expect(await answer.innerText()).toBe(question.acceptedAnswer.text);
				await trigger.click();
			}

			const howToScript = page.locator("script#howto-jsonld");
			await expect(howToScript).toHaveCount(1);
			const howToSchema: IFHowToSchema = JSON.parse(
				(await howToScript.textContent()) ?? "",
			);
			expect(howToSchema["@type"]).toBe("HowTo");
			expect(howToSchema.step).toHaveLength(3);
			const howToSection = page.locator("section").filter({ has: howToScript });
			const visibleSteps = howToSection.getByRole("listitem");
			await expect(visibleSteps).toHaveCount(3);

			for (let index = 0; index < howToSchema.step.length; index += 1) {
				const step = howToSchema.step[index];
				expect(step["@type"]).toBe("HowToStep");
				expect(step.position).toBe(index + 1);
				expect(step.name.trim()).not.toBe("");
				expect(step.text.trim()).not.toBe("");
				const visibleStep = visibleSteps.nth(index);
				expect(await visibleStep.getByRole("heading").innerText()).toBe(
					step.name,
				);
				expect(await visibleStep.locator("p").innerText()).toBe(step.text);
			}
		});
	}
});

/** 브라우저가 읽은 FAQPage 구조화 데이터입니다. */
interface IFFaqSchema {
	"@type": string;
	mainEntity: {
		"@type": string;
		name: string;
		acceptedAnswer: { "@type": string; text: string };
	}[];
}

/** 브라우저가 읽은 HowTo 구조화 데이터입니다. */
interface IFHowToSchema {
	"@type": string;
	step: {
		"@type": string;
		position: number;
		name: string;
		text: string;
	}[];
}
