
const toBuckets = (t) => {
	const buckets = [];
	let currentSpeaker = null;

	if (!t || !t.results || !t.results.speaker_labels) {
		return buckets;
	}

	t.results.speaker_labels.segments.forEach((segment) => {
		const startTime = segment.start_time;
		const speaker = segment.speaker_label;
		const endTime = segment.end_time;
		let content = '';

		// Seek through all t.results.items and find matching segments (with punctionation)
		// seek to find start time
		let index = t.results.items.findIndex(i => i.start_time === startTime);
		let item = null;
		do {
			item = t.results.items[index];

			if (item.type === 'punctuation') {
				index += 1;
				continue; // eslint-disable-line no-continue
			}

			content += (index === 0 ? '' : ' ') + item.alternatives[0].content;

			// peek at the next one and see if its punctuation
			if (index < t.results.items.length - 1 && t.results.items[index + 1].type === 'punctuation') {
				content += t.results.items[index + 1].alternatives[0].content;
			}
			index += 1;
		} while ((!item.end_time || item.end_time < endTime) && index < t.results.items.length);

		// const utterance = findUtterance(t.results.items, { startTime, endTime });

		if (currentSpeaker === speaker) {
			buckets[buckets.length - 1].utterance += content;
			buckets[buckets.length - 1].endTime = endTime;
		} else {
			buckets.push({
				utterance: content,
				startTime,
				endTime,
				speaker,
			});
			currentSpeaker = speaker;
		}
	});

	return buckets;
};

export default function transformTranscriptToEditor(transcript) {
	const buckets = toBuckets(transcript);

	// Turn buckets into editor blocks
	/*
	[{ startTime, endTime, speaker, utterance }]
	*/
	return {
		object: 'value',
		document: {
			object: 'document',
			nodes: [

				...buckets.map((bucket) => {
					return {
						object: 'block',
						type: 'transcript',
						data: {
							...bucket,
						},
						nodes: [
							{
								object: 'text',
								text: bucket.utterance,
								marks: [],
							},
						],
					};
				}),
				{
					object: 'block',
					type: 'paragraph',
					data: {},
					nodes: [
						{
							object: 'text',
							text: '',
							marks: [],
						},
					],
				},
			],
		},
	};
}
