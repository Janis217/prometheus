"""Check bounded DM-UC design coverage; no provider, robot or runtime validation."""
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
data = json.loads((ROOT / '.agents/dm-usecase-matrix.json').read_text(encoding='utf-8'))
scenarios = {'fire', 'route', 'search'}
phases = {'initiation', 'configuration', 'approval', 'coordination', 'escalation', 'completion_handoff'}
rules = {
    'missing_information': {'initiation', 'configuration', 'approval'},
    'unclear_objective': {'initiation', 'configuration', 'approval', 'escalation'},
    'capability_gap': {'configuration', 'approval', 'coordination', 'escalation'},
    'obstacle': {'coordination', 'escalation', 'completion_handoff'},
    'connection_loss': {'coordination', 'escalation', 'completion_handoff'},
    'operator_abort': {'approval', 'coordination', 'escalation', 'completion_handoff'},
}


def require(condition, message):
    if not condition:
        raise SystemExit(message)


require(set(data['scenarios']) == scenarios, 'Scenario axis drift')
require(set(data['phases']) == phases, 'Phase axis drift')
require(set(data['deviations']) == {'ordinary', *rules}, 'Deviation axis drift')
expected = set(itertools.product(scenarios, phases, {'ordinary', *rules}))
actual = {(cell['scenario'], cell['phase'], cell['deviation']) for cell in data['cells']}
require(actual == expected and len(data['cells']) == len(expected), 'Missing/duplicate matrix cells')
catalog = {uc['id']: uc for uc in data['catalog']}
require(len(catalog) == len(data['catalog']) == 6, 'Expected six unique use cases')
require(set(catalog) == {f'UC-{scenario.upper()}-{variant:02}' for scenario in scenarios for variant in [1, 2]}, 'Catalog ID drift')
require(set(catalog) == {f'UC-{scenario.upper()}-{variant:02}' for scenario in scenarios for variant in [1, 2]}, 'Catalog ID drift')
require(len({cell['id'] for cell in data['cells']}) == len(expected), 'Duplicate cell IDs')
for cell in data['cells']:
    selected = cell['deviation'] == 'ordinary' or cell['phase'] in rules[cell['deviation']]
    require(cell['status'] == ('selected' if selected else 'excluded'), f'Selection drift: {cell["id"]}')
    require(bool(cell['rationale'].strip()), f'Missing rationale: {cell["id"]}')
    if selected:
        require(cell['useCase'] in catalog, f'Unknown use case: {cell["id"]}')
        uc = catalog[cell['useCase']]
        require(uc['scenario'] == cell['scenario'] and cell['deviation'] in uc['deviations'], 'Mapping drift')
    else:
        require(cell['useCase'] is None, 'Excluded cell assigned to use case')
for uc in catalog.values():
    require(set(uc['phases']) == phases, f'Incomplete phase mapping: {uc["id"]}')
    require(set(uc['milestones']) == {'DM-INT', 'DM-03', 'DM-04', 'DM-05', 'DM-06'}, 'Milestone gap')
    require(any(cell['useCase'] == uc['id'] for cell in data['cells']), 'Unused use-case ID')
    require(uc['priority'] == {'fire': 0, 'route': 1, 'search': 2}[uc['scenario']], 'Priority drift')
    require(set(uc['deviations']) == ({'ordinary'} if uc['id'].endswith('01') else set(rules)), 'Catalog deviation gap')
    require(uc['priority'] == {'fire': 0, 'route': 1, 'search': 2}[uc['scenario']], 'Priority drift')
    require(set(uc['deviations']) == ({'ordinary'} if uc['id'].endswith('01') else set(rules)), 'Catalog deviation gap')
    for path in ['.agents/PLAN_DM_USECASE_SYSTEMATICS.md', '.agents/PLAN_DM_TRACEABILITY.md', '.agents/GITHUB_ISSUE_BACKLOG.md']:
        require(uc['id'] in (ROOT / path).read_text(encoding='utf-8'), f'{uc["id"]} missing in {path}')
require(set(data['interactionWorkPackages']) == {'state_and_messages', 'escalation_loop',
    'completion_and_handoff', 'ordinary_and_challenging_journey', 'tests_and_walkthrough'}, 'DM-INT package gap')
for ids in data['interactionWorkPackages'].values():
    require(ids and all(key in catalog for key in ids), 'DM-INT package has no valid use case')
trace = (ROOT / '.agents/PLAN_DM_TRACEABILITY.md').read_text(encoding='utf-8')
for requirement in ['DR-01', 'DR-02', 'DR-03', 'DR-04', 'DR-05']:
    require(requirement in trace, f'Missing requirement {requirement}')
backlog = (ROOT / '.agents/GITHUB_ISSUE_BACKLOG.md').read_text(encoding='utf-8')
for number, milestone in [(14, 'DM-INT'), (15, 'DM-03'), (16, 'DM-04'), (17, 'DM-05'), (18, 'DM-06')]:
    entry = backlog.split(f'## {number}. {milestone}:', 1)[1].split('\n## ', 1)[0]
    require('UC-FIRE-01' in entry and 'UC-FIRE-02' in entry, f'{milestone} missing use-case consumers')
backlog = (ROOT / '.agents/GITHUB_ISSUE_BACKLOG.md').read_text(encoding='utf-8')
for number, milestone in [(14, 'DM-INT'), (15, 'DM-03'), (16, 'DM-04'), (17, 'DM-05'), (18, 'DM-06')]:
    entry = backlog.split(f'## {number}. {milestone}:', 1)[1].split('\n## ', 1)[0]
    require('UC-FIRE-01' in entry and 'UC-FIRE-02' in entry, f'{milestone} missing use-case consumers')
print(f'PASS: {len(expected)} unique cells; {len(catalog)} use cases; five DM-INT work packages; DR-01..DR-05 mapped.')
