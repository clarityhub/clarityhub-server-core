export default function fileTypeToFormat(fileType) {
	switch (fileType) {
	case 'audio/mp3':
		return 'mp3';
	case 'audio/mpeg':
		return 'mp4';
	case 'audio/aac':
		return 'aac';
	case 'audio/wav':
	default:
		return 'wav';
	}
}
