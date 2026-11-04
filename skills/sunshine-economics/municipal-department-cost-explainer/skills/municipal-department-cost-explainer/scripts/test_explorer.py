#!/usr/bin/env python3
"""Run from any directory: python3 scripts/test_explorer.py."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
from render_explorer import ROOT, MAX_SAFE, render, validate


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "references/example-data.json").read_text())

    def rejects(self, mutate):
        mutate(self.data)
        with self.assertRaises((ValueError, TypeError)):
            validate(self.data)

    def test_example_contract_and_standalone_render(self):
        html = render(self.data)
        self.assertIn('id="budget-data"', html)
        self.assertNotIn('EXPLORER_DATA', html)
        self.assertNotIn('src="http', html)

    def test_script_closing_data_remains_inert(self):
        attack = '</script><script>alert(1)</script>'
        self.data['cases'][0]['summary'] = attack
        html = render(self.data)
        self.assertNotIn(attack, html)
        self.assertIn('\\u003c/script>', html)

    def test_no_mixed_year(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(period='FY2025'))

    def test_no_mixed_status(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(status='actual'))

    def test_no_mixed_basis(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(basis='cash'))

    def test_no_duplicate_row(self):
        self.rejects(lambda d: d['cases'][0]['rows'].append(copy.deepcopy(d['cases'][0]['rows'][0])))

    def test_no_duplicate_case(self):
        self.rejects(lambda d: d['cases'].append(copy.deepcopy(d['cases'][0])))

    def test_unknown_source_rejected(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(sourceId='missing'))

    def test_javascript_citation_rejected(self):
        self.rejects(lambda d: d['cases'][0]['sources'][0].update(url='javascript:alert(1)'))

    def test_unverified_expense_rejected(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(verified=False))

    def test_unknown_amount_not_zero(self):
        validate(self.data)
        self.assertIsNone(self.data['cases'][0]['rows'][-1]['amount'])
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(amount=None))

    def test_strings_floats_bools_and_large_amounts_rejected(self):
        for amount in ['1000', 1.5, True, MAX_SAFE + 1, float('nan')]:
            with self.subTest(amount=amount):
                d = copy.deepcopy(self.data)
                d['cases'][0]['rows'][0]['amount'] = amount
                with self.assertRaises(ValueError):
                    validate(d)

    def test_allocation_keeps_source_sign(self):
        self.rejects(lambda d: d['cases'][0]['rows'][4].update(amount=3008510))

    def test_scope_confirmation_required(self):
        self.rejects(lambda d: d['cases'][0]['rows'][5].update(scopeConfirmed=False))

    def test_overflow_rejected(self):
        self.rejects(lambda d: d['cases'][0]['rows'][0].update(amount=MAX_SAFE))

    def test_net_cannot_use_cost_or_transfer(self):
        self.rejects(lambda d: d['cases'][1]['netFunding'].update(revenueIds=['s-total']))

    def test_net_cannot_double_count_revenue(self):
        self.rejects(lambda d: d['cases'][1]['netFunding'].update(revenueIds=['s-services', 's-services']))

    def test_checks_cannot_double_count(self):
        self.rejects(lambda d: d['cases'][0]['checks'][0].update(rowIds=['e-personnel', 'e-personnel']))

    def test_exact_dates_required(self):
        self.rejects(lambda d: d['cases'][0].update(startDate='unknown'))

    def test_fictional_adopted_is_supported(self):
        c = self.data['cases'][3]
        c['status'] = 'adopted'
        for r in c['rows']:
            r['status'] = 'adopted'
        validate(self.data)

    def test_no_accidental_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'review.html'
            path.write_text('keep this')
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/render_explorer.py'),
                                     '--demo', '--output', str(path)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(path.read_text(), 'keep this')


if __name__ == '__main__':
    unittest.main(verbosity=2)
