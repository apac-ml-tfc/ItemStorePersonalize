import axios from "axios";
import React from "react";
import { Alert, DropdownButton, Form, FormControl, MenuItem } from "react-bootstrap";
import ProductRow from "../storeItem/storeItem";
import { Product } from "../storeItem/storeItem";
import getConfig from "../../config";
import "./recommendationList.scss";

import {
  withRouter,
  RouteComponentProps
} from "react-router-dom";
import { Col } from "react-bootstrap";

const configP = getConfig();

const RecommendationMode = {
  Normal: "Normal",
  SimilarItems: "SimilarItems",
  ItemsForUser: "ItemsForUser"
};

export interface RecommendationListProps {
  userId?: string | undefined;
  searchid?: string | undefined;
  mode: string;
  productId?: string | undefined;
}

export interface FilterParameter {
  name: string;
  id: string;
  paramType: string | string[];
}

export interface FilterSpecification {
  name: string
  params: FilterParameter[];
}

interface RecommendationListState {
  availableFilters: FilterSpecification[];
  activeFilter: FilterSpecification | null;
  filterParams: { [id: string]: string };
  userId?: string | undefined;
  isLoading: boolean;
  items: Product[];
  mode: string;
  warning: string | undefined;
}

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    let result: any;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      result = fn.apply(this, args);
    }, delay);
    return result;
  };
}

export class RecommendationList extends React.Component<
  RouteComponentProps<RecommendationListProps> & RecommendationListProps,
  RecommendationListState
> {
  constructor(
    props: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps
  ) {
    super(props);

    this.onFilterSelect = this.onFilterSelect.bind(this);
    this.onFilterChanged = debounce(this.onFilterChanged, 300).bind(this);

    this.state = {
      availableFilters: [],
      activeFilter: null,
      filterParams: {},
      userId: props.userId,
      isLoading: true,
      items: [],
      mode: RecommendationMode.Normal,
      warning: undefined,
    };

    configP.then(config => {
      if (config.user.id && !this.props.userId) this.setState({ userId: config.user.id });
    });
  }

  async _loadAsyncData() {
    let fetchLess = false;

    const config = await configP;

    let getUrl = config.api.GetListUrl;
    const getQuery: { [param: string]: string } = {};

    if (this.props.mode === RecommendationMode.Normal) {
      if (
        this.props.match.params.searchid &&
        this.props.match.params.searchid.length > 0
      ) {
        getUrl = config.api.SearchUrl;
        getQuery.q = this.props.match.params.searchid;
        if (this.props.userId) {
          getQuery.u = this.props.userId;
        }
      } else {
        if (this.props.userId != null) getUrl += this.props.userId;
        if (this.state.activeFilter) {
          getQuery.filter = this.state.activeFilter.name;
          this.state.activeFilter.params.forEach((paramspec) => {
            getQuery[paramspec.id] = this.state.filterParams[paramspec.id]
          });
        }
      }
    } else {
      fetchLess = true;
      if (this.props.productId) {
        getUrl = config.api.RecommendSimilar + this.props.productId;
      } else {
        if (this.props.userId) {
          getUrl += this.props.userId;
        }
      }
    }

    // Get the data
    axios.get(getUrl, { params: getQuery })
      .then(({ data }) => {
        console.log(data);
        const results = data?.results || [];
        const availableFilters = (data?.filtersAvailable || []) as FilterSpecification[];
        const stateUpdates: any = {
          availableFilters,
          isLoading: false,
          items: fetchLess ? results.slice(0, 10) : results.slice(),
          warning: data?.warning,
        };
        if (this.state.activeFilter && availableFilters.indexOf(this.state.activeFilter) < 0) {
          stateUpdates.activeFilter = availableFilters.find(
            f => f.name === (this.state.activeFilter as FilterSpecification).name
          ) || null;
        }
        this.setState(stateUpdates);
      });
  }

  static getDerivedStateFromProps(
    newProps: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps,
    prevState: RecommendationListState
  ) {
    // Any time the current user changes,
    // Reset any parts of state that are tied to that user.
    // In this simple example, that's just the email.
    if (newProps.userId !== prevState.userId) {
      return {
        userId: newProps.userId,
        isLoading: false,
        items: null,
        mode: newProps.mode
      };
    }
    return null;
  }

  componentDidMount() {
    this.setState({ isLoading: true });
    this._loadAsyncData();
  }

  componentDidUpdate(
    prevProps: RouteComponentProps<RecommendationListProps> &
      RecommendationListProps,
    prevState: RecommendationListState
  ) {
    if (this.state.items === null) {
      this._loadAsyncData();
    }
  }

  createTable = () => {
    const listItems = this.state.items || [];
    let userid = this.props.userId;
    var xs: number ,md: number , lg : number,sm : number
    if (this.props.mode === RecommendationMode.Normal){
      xs = 12;
      sm = 6;
      md = 6;
      lg = 4;
    }
    else {
      xs = 12;
      sm = 6;
      md = 4;
      lg = 3;
    }
    let productcat: JSX.Element[] = [];

    if (this.state.isLoading) {
      productcat.push(
        <Alert key={-1} bsStyle="info">
          <i className="glyphicon glyphicon-repeat fast-right-spinner"></i>{" "}
          Loading...
        </Alert>
      )
    }

    try {
      listItems.forEach(function(item, index) {
        productcat.push(
            <Col xs={xs} sm={sm} md={md} lg={lg} className="product" key={index}>
              <ProductRow
                uid={userid}
                key={item.asin}
                title={item.title}
                imUrl={item.imUrl}
                productId={item.asin}
              ></ProductRow>
            </Col>
          );
      })
    }
    catch(e){
      console.log(e)
    }

    return productcat;
  };

  onFilterSelect(key: any) {
    const activeFilter = key >= 0 ? this.state.availableFilters[key] : null;
    const stateUpdates: any = {
      activeFilter,
      isLoading: true,
    }
    if (activeFilter) {
      const newParams = { ...this.state.filterParams };
      let anyParamUpdates = false;
      activeFilter.params.forEach(spec => {
        if (Array.isArray(spec.paramType) && spec.paramType.length) {
          const defaultValue = spec.paramType[0];
          if (newParams[spec.id] !== defaultValue) {
            newParams[spec.id] = defaultValue;
            anyParamUpdates = true;
          }
        }
      });
      if (anyParamUpdates) {
        stateUpdates.filterParams = newParams;
      }
    }
    this.setState(stateUpdates);
    this.onFilterChanged();
  }

  onFilterChanged() {
    // This fn gets debounced by the constructor
    this._loadAsyncData();
  }

  onFilterParamUpdate(key: string, val: string) {
    const newParams = { ...this.state.filterParams };
    newParams[key] = val;
    this.setState({
      filterParams: newParams,
      isLoading: true,
    });
    this.onFilterChanged();
  }

  render() {
    let currentClassName;
    if (this.props.mode === RecommendationMode.Normal) {
      currentClassName = "recommend";
      return (
        <div className={currentClassName}>
          {
            this.state.availableFilters.length
              ? <Form inline className="filter-form">
                <DropdownButton className="filter-selector" id="filter-selector" title={
                  `Filter: ${this.state.activeFilter ? this.state.activeFilter.name : "None"}`
                }>
                  <MenuItem eventKey={-1} active onSelect={this.onFilterSelect}>None</MenuItem>
                  {this.state.availableFilters.map((spec, ix) => (
                    <MenuItem eventKey={ix} onSelect={this.onFilterSelect}>{spec.name}</MenuItem>
                  ))}
                </DropdownButton>
                {
                  this.state.activeFilter
                    ? this.state.activeFilter.params.map(paramspec => (
                      (Array.isArray(paramspec.paramType) && paramspec.paramType.length)
                        ? <DropdownButton className="filter-param filter-param-dropdown" id="filter-selector"
                            title={this.state.filterParams[paramspec.id]}
                          >
                            {paramspec.paramType.map((opt, ix) => (
                              <MenuItem eventKey={ix} onSelect={(ix: any) => this.onFilterParamUpdate(paramspec.id, paramspec.paramType[ix])}>{opt}</MenuItem>
                            ))}
                          </DropdownButton>
                        : <FormControl
                            className="filter-param filter-param-text"
                            type="text"
                            value={this.state.filterParams[paramspec.id]}
                            placeholder={paramspec.name}
                            onChange={(e) => this.onFilterParamUpdate(paramspec.id, (e.target as any).value)}
                          />
                    ))
                    : null
                }
              </Form>
              : null
          }
          {
            this.state.warning
              ? <Alert bsStyle="warning">
                <i className="glyphicon glyphicon-warning-sign"></i> {this.state.warning}
              </Alert>
              : null
          }
          {this.createTable()}
        </div>
      );
    }
    else {
      if (this.props.mode === RecommendationMode.SimilarItems) {
        currentClassName = "similar";
      } else {
        currentClassName = "itemsForUser";
      }

      return (
        <div className={currentClassName}>
          {
            this.state.warning
              ? <Alert bsStyle="warning">
                <i className="glyphicon glyphicon-warning-sign"></i> {this.state.warning}
              </Alert>
              : null
          }
          <div className="container testimonial-group">
            <div className="row text-center">
              {this.createTable()}
            </div>
          </div>
        </div>
      );
    }
  }
}

export default withRouter(RecommendationList);
