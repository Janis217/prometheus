"""Replay a fixed synthetic fire-image journey against an existing local scoped agent.

No model, image analysis, authenticated supervisor or physical executor is used.
Set DM_ACCESS_CODE privately; create a fresh core.disaster_mission_configuration
instance via the usual scoped flow. Do not run against deployment endpoints.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from uuid import UUID


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--agent-id', required=True)
    parser.add_argument('--variant', choices=['ordinary', 'obstacle', 'abort'], default='obstacle')
    parser.add_argument('--output', default='target/dm-int-replay.json')
    args = parser.parse_args()
    url = urlparse(args.base_url)
    if url.scheme != 'http' or url.hostname not in ('localhost', '127.0.0.1', '::1') or url.username or url.query or url.fragment or url.path not in ('', '/'):
        raise SystemExit('Use a loopback-only HTTP application origin.')
    code = os.environ.get('DM_ACCESS_CODE')
    if not code:
        raise SystemExit('Set DM_ACCESS_CODE in the environment; never pass credentials in the command line.')
    agent = str(UUID(args.agent_id))
    base = args.base_url.rstrip('/') + '/demo/agents/' + agent

    def request(path, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = Request(base + path, data=data,
                      headers={'X-Prometheus-Access-Code': code, 'Content-Type': 'application/json'})
        with urlopen(req, timeout=30) as response:
            return json.load(response)

    entries = request('/storage')
    if any(entry['key'] == 'disaster_mission_simulation' for entry in entries):
        raise SystemExit('Use a fresh or explicitly reset agent; the script never resets existing history.')
    timeline = []
    state = None

    def say(action, expected):
        nonlocal state
        command = 'simulate fire ' + action
        if state is not None:
            command += ' ' + state['runId'] + ' ' + str(state['revision'])
        outcome = request('/acknowledge', {'type': 'obs.user_utterance', 'kind': 'observation',
                        'actor': 'demo_operator', 'payload': command})
        state = json.loads(json.loads(outcome['responseEvent']['payload'])['speech'])
        timeline.append({'command': command, 'state': state})
        if state.get('phase') != expected or not state.get('simulation') or state.get('operationalReady') is not False or state.get('lastRejection'):
            raise RuntimeError('Unexpected simulation transition: ' + action)

    say('begin', 'configuration')
    for action, phase in [('configure', 'approval'), ('confirm', 'confirmed'), ('start', 'coordination'), ('progress', 'coordination')]:
        say(action, phase)
    if args.variant == 'obstacle':
        say('obstacle', 'escalation')
        say('resume', 'coordination')
        say('progress', 'coordination')
    if args.variant == 'abort':
        say('connection_loss', 'escalation')
        say('abort', 'completion_handoff')
    else:
        say('complete', 'completion_handoff')
    say('handoff', 'closed')
    entries = request('/storage')
    stored = json.loads(next(entry['value'] for entry in entries if entry['key'] == 'disaster_mission_simulation'))
    if stored != state:
        raise RuntimeError('Emitted and stored simulation snapshots differ')
    artifact = {'simulation': True, 'variant': args.variant, 'timeline': timeline,
                'storage': [entry for entry in entries if entry['key'].startswith('disaster_mission_simulation')]}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(artifact, indent=2) + '\n', encoding='utf-8')
    print(f'PASS: simulated {args.variant} journey; {len(timeline)} transitions; artifact {path}')


if __name__ == '__main__':
    main()
