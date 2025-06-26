export function debounce<A extends unknown[]>(
	callback: (...args: A) => void,
	delay: number,
) {
	let timer: NodeJS.Timeout;
	return (...args: A) => {
		clearTimeout(timer);
		timer = setTimeout(() => callback(...args), delay);
	};
}
