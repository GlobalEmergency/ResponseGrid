import { GroupMember } from './group-member';
import { GroupMemberStatus } from './group-enums';

const GROUP = 'g-1';
const USER = 'u-1';
const MANAGER = 'm-1';

describe('GroupMember', () => {
  it('a self-request starts pending with no adder', () => {
    const member = GroupMember.request(GROUP, USER);
    expect(member.status).toBe(GroupMemberStatus.Pending);
    expect(member.isApproved).toBe(false);
    expect(member.addedByUserId).toBeNull();
  });

  it('a manager-added member is approved with the adder recorded', () => {
    const member = GroupMember.addApproved(GROUP, USER, MANAGER);
    expect(member.isApproved).toBe(true);
    expect(member.addedByUserId).toBe(MANAGER);
  });

  it('approving a pending member records the approver', () => {
    const approved = GroupMember.request(GROUP, USER).approve(MANAGER);
    expect(approved.isApproved).toBe(true);
    expect(approved.addedByUserId).toBe(MANAGER);
  });

  it('round-trips through a snapshot', () => {
    const member = GroupMember.addApproved(GROUP, USER, MANAGER);
    expect(GroupMember.fromSnapshot(member.toSnapshot()).toSnapshot()).toEqual(
      member.toSnapshot(),
    );
  });
});
