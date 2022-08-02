import AccessControl from 'accesscontrol';
import { GUEST, MEMBER, ADMIN } from './domains/workspaces/Roles';

const ac = new AccessControl();
ac.grant(GUEST)
	.readOwn('workspace')
	.readAny('member')
	.readAny('interview')
	.readAny('interviewV2')
	.readAny('tag')
	.readAny('videoCalls')
	.readAny('media');

ac.grant(MEMBER)
	.extend(GUEST)
	.create('workspace')
	.create('interview')
	.deleteOwn('interview')
	.updateAny('interview')
	.create('interviewV2')
	.deleteOwn('interviewV2')
	.updateAny('interviewV2')
	.create('tag')
	.updateAny('tag')
	.deleteAny('tag')
	.create('videoCalls')
	.updateAny('videoCalls')
	.deleteAny('videoCalls')
	.create('media')
	.updateAny('media')
	.deleteOwn('media');

ac.grant(ADMIN)
	.extend(GUEST)
	.extend(MEMBER)
	.create('member')
	.updateAny('member')
	.deleteAny('member')
	.updateAny('workspace')
	.deleteOwn('workspace')
	.deleteAny('interview')
	.deleteAny('interviewV2')
	.deleteAny('videoCall')
	.deleteAny('media')
	.updateAny('billing')
	.readAny('billing')
	.deleteAny('billing')
	.readAny('integrations')
	.create('integrations')
	.updateAny('integrations')
	.deleteAny('integrations');

export default ac;
