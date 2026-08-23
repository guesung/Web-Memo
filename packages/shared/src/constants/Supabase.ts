export const SUPABASE = {
	url: "https://czwtqukymcqoberdoltq.supabase.co",
	anonKey:
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6d3RxdWt5bWNxb2JlcmRvbHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0NTQ2MzcsImV4cCI6MjA0MjAzMDYzN30.K4bmcOuKM1WBwPyeomTit7_Y2xQGG6N4JPFOTGgyCI0",
	authToken: "sb-czwtqukymcqoberdoltq-auth-token",
	testEmail: "test@test.com",
	testPassword: "abcd1234",
	schema: {
		memo: "memo",
		feedback: "feedback",
	},
	table: {
		memo: "memo",
		category: "category",
		setting: "setting",
		highlight: "highlight",
	},
} as const;
