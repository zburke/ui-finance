import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
// Components and Pages
import Layer from '@folio/stripes-components/lib/Layer';
import Pane from '@folio/stripes-components/lib/Pane';
import PaneMenu from '@folio/stripes-components/lib/PaneMenu';
import { Row, Col } from '@folio/stripes-components/lib/LayoutGrid';
import Icon from '@folio/stripes-components/lib/Icon';
import IconButton from '@folio/stripes-components/lib/IconButton';
import IfPermission from '@folio/stripes-components/lib/IfPermission';
import KeyValue from '@folio/stripes-components/lib/KeyValue';
import BudgetPane from './BudgetPane';

class BudgetView extends Component {
  static propTypes = {
    onCloseEdit: PropTypes.func,
    parentResources: PropTypes.object,
    parentMutator: PropTypes.object,
    match: PropTypes.shape({
      params: PropTypes.shape({
        id: PropTypes.string
      })
    }),
    stripes: PropTypes.object,
    location: PropTypes.object,
    onEdit: PropTypes.func,
    editLink: PropTypes.string,
    onClose: PropTypes.func,
    paneWidth: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ])
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { parentMutator, parentResources, match: { params: { id } } } = nextProps;
    if (parentResources && (parentResources.fundID || parentResources.fiscalyearID)) {
      if (!_.isEqual(prevState.viewID, id)) {
        parentMutator.queryCustom.update({ budgetIDQuery: `query=(id="${id}")` });
        return { viewID: id };
      }

      const budget = parentResources.records.records;
      const data = budget !== null ? budget.find(u => u.id === id) : false;
      if (data) {
        const fundID = data.fund_id;
        const fyID = data.fiscal_year_id;
        if (!_.isEqual(prevState.fundID, fundID) || !_.isEqual(prevState.fyID, fyID)) {
          parentMutator.queryCustom.update({
            fundQueryID: `query=(id="${fundID}")`,
            fiscalyearQueryID: `query=(id="${fyID}")`
          });
          return { fyID, fundID };
        }
      }
    }
    return false;
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.getData = this.getData.bind(this);
    this.getFiscalYears = this.getFiscalYears.bind(this);
    this.getFund = this.getFund.bind(this);
    this.connectedBudgetPane = this.props.stripes.connect(BudgetPane);
  }

  componentWillUnmount() {
    const { parentMutator } = this.props;
    parentMutator.queryCustom.update({
      budgetIDQuery: 'query=(id=null)',
      fundQueryID: 'query=(id=null)',
      fiscalyearQueryID: 'query=(id=null)',
    });
  }

  getData() {
    const { parentResources, match: { params: { id } } } = this.props;
    const budget = (parentResources.records || {}).records || [];
    if (!budget || budget.length === 0 || !id) return null;
    return budget.find(u => u.id === id);
  }

  getFiscalYears = () => {
    const { parentResources } = this.props;
    const fiscalYears = (parentResources.fiscalyearID || {}).records || [];
    if (!fiscalYears || fiscalYears.length === 0) return null;
    return (
      <span>{_.get(fiscalYears[0], ['name'], '')}</span>
    );
  }

  getFund = () => {
    const { parentResources } = this.props;
    const data = (parentResources.fundID || {}).records || [];
    if (!data || data.length === 0) return null;
    return (
      <span>{_.get(data[0], ['name'], '')}</span>
    );
  }

  update(data) {
    const fiscalID = data.fiscal_year_id;
    const fundID = data.fund_id;
    if (fiscalID === '' || fiscalID == null) {
      data.fiscal_year_id = null;
    }
    if (fundID === '' || fundID == null) {
      data.fund_id = null;
    }
    this.props.parentMutator.records.PUT(data).then(() => {
      this.props.onCloseEdit();
    });
  }

  render() {
    const { location } = this.props;
    const initialValues = this.getData();
    const query = location.search ? queryString.parse(location.search) : {};
    const detailMenu = (
      <PaneMenu>
        <IfPermission perm="budget.item.put">
          <IconButton
            icon="edit"
            id="clickable-editbudget"
            style={{ visibility: !initialValues ? 'hidden' : 'visible' }}
            onClick={this.props.onEdit}
            href={this.props.editLink}
            title="Edit Budget"
          />
        </IfPermission>
      </PaneMenu>
    );

    if (!initialValues) {
      return (
        <Pane id="pane-budgetdetails" defaultWidth={this.props.paneWidth} paneTitle="Budget View" lastMenu={detailMenu} dismissible onClose={this.props.onClose}>
          <div style={{ paddingTop: '1rem' }}><Icon icon="spinner-ellipsis" width="100px" /></div>
        </Pane>
      );
    }

    return (
      <Pane id="pane-budgetdetails" defaultWidth={this.props.paneWidth} paneTitle={_.get(initialValues, ['name'], '')} lastMenu={detailMenu} dismissible onClose={this.props.onClose}>
        <Row>
          <Col xs={3}>
            <KeyValue label="name" value={_.get(initialValues, ['name'], '')} />
          </Col>
          <Col xs={3}>
            <KeyValue label="code" value={_.toString(_.get(initialValues, ['code'], ''))} />
          </Col>
          <Col xs={3}>
            <KeyValue label="fiscal year" value={this.getFiscalYears()} />
          </Col>
          <Col xs={3}>
            <KeyValue label="fund" value={this.getFund()} />
          </Col>
        </Row>
        <Layer isOpen={query.layer ? query.layer === 'edit' : false} label="Edit Budget Dialog">
          <this.connectedBudgetPane
            stripes={this.props.stripes}
            initialValues={initialValues}
            onSubmit={(record) => { this.update(record); }}
            onCancel={this.props.onCloseEdit}
            parentResources={this.props.parentResources}
            parentMutator={this.props.parentMutator}
          />
        </Layer>
      </Pane>
    );
  }
}

export default BudgetView;
