"""Replay simulation feedback for an already configured/approved local R-204 agent.

Credentials come only from DM_ACCESS_CODE and DM_SUPERVISOR_TOKEN. This script
never captures a brief, calls inference, resets an agent or contacts hardware.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from uuid import UUID, uuid4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--agent-id', required=True)
    parser.add_argument('--variant', choices=['ordinary', 'obstacle', 'failure', 'timeout', 'abort'], default='obstacle')
    parser.add_argument('--output', default='target/dm05-replay.json')
    args = parser.parse_args()
    url = urlparse(args.base_url)
    if url.scheme != 'http' or url.hostname not in ('localhost', '127.0.0.1', '::1') or url.username or url.query or url.fragment or url.path not in ('', '/'):
        raise SystemExit('Use a loopback-only HTTP application origin.')
    code, token = os.environ.get('DM_ACCESS_CODE'), os.environ.get('DM_SUPERVISOR_TOKEN')
    if not code or not token:
        raise SystemExit('Set DM_ACCESS_CODE and DM_SUPERVISOR_TOKEN privately in the environment.')
    base = args.base_url.rstrip('/') + '/demo/agents/' + str(UUID(args.agent_id))

    def request(path, payload=None, supervisor=False):
        headers = {'X-Prometheus-Access-Code': code, 'Content-Type': 'application/json'}
        if supervisor:
            headers['X-Prometheus-Supervisor-Token'] = token
        req = Request(base + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
        with urlopen(req, timeout=30) as response:
            return json.load(response)

    entries = request('/storage')
    if any(entry['key'] == 'disaster_execution' for entry in entries):
        raise SystemExit('Use an approved fresh/reset agent; existing execution is never replaced.')
    review = request('/mission-review')
    mission = json.loads(review['mission'])
    if not mission.get('ready') or mission.get('approvalState') != 'supervisor_approved':
        raise SystemExit('Configure and obtain authenticated approval before running the adapter replay.')
    state = request('/mission-execution', {'requestId': str(uuid4()), 'revision': mission['revision'],
        'reviewVersion': review['reviewVersion'], 'safetyReference': review['safetyReference'],
        'variant': 'ordinary' if args.variant == 'abort' else args.variant}, supervisor=True)
    timeline = [{'action': 'start', 'state': state}]

    def update(action):
        nonlocal state
        state = request('/mission-execution/updates', {'executionId': state['executionId'],
            'expectedSequence': state['sequence'], 'action': action})
        if state.get('simulation') is not True or state.get('operationalReady') is not False:
            raise RuntimeError('Unexpected operational claim in simulation output')
        timeline.append({'action': action, 'state': state})

    update('step')
    if args.variant == 'abort':
        update('abort')
    else:
        update('step'); update('step')
        if args.variant == 'obstacle':
            if state['phase'] != 'escalation':
                raise RuntimeError('Expected obstacle escalation')
            update('resume'); update('step'); update('step')
    if state['phase'] != 'completion_handoff':
        raise RuntimeError('Expected pending handoff')
    update('handoff')
    expected = {'ordinary': 'completed', 'obstacle': 'completed', 'failure': 'failed', 'timeout': 'timed_out', 'abort': 'cancelled'}[args.variant]
    if state['phase'] != 'closed' or state['result']['outcome'] != expected or request('/mission-execution') != state:
        raise RuntimeError('Unexpected final simulation result or persistence mismatch')
    path = Path(args.output); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'simulation': True, 'variant': args.variant, 'review': review, 'timeline': timeline,
        'storage': [entry for entry in request('/storage') if entry['key'].startswith('disaster_execution')]}, indent=2) + '\n', encoding='utf-8')
    print(f'PASS: adapter {args.variant}; {len(timeline)} transitions; artifact {path}')


if __name__ == '__main__':
    main()
