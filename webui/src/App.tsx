// External Dependencies:
import React, { Component } from "react";
import { Alert, Navbar, NavDropdown, NavItem, MenuItem, Nav} from "react-bootstrap";
import { BrowserRouter as Router, withRouter, Switch, RouteComponentProps, Route } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

// Local Dependencies:
import "./App.scss";
import getConfig from "./config";
import notFound from "./modules/notFound/notFound";
import ProductDetail from "./modules/productDetail/productDetail";
import RecommendationList from "./modules/recommendationList/recommendationList";
import SearchBar from "./modules/searchBar/searchBar";

const configP = getConfig();

interface AppProps {
  history: any;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppState {
  error?: string;
  selectedUser: User | undefined;
  userList: Array<User>;
  userSelectedName : string;
  SID : string | null;
}

class App extends Component<RouteComponentProps<AppProps>, AppState> {
  constructor(props: RouteComponentProps<AppProps>) {
    super(props);
    let user = localStorage.getItem("user");
    if (user) {
      let userobj = JSON.parse(user)
      this.state = {
        selectedUser: userobj,
        SID: localStorage.getItem("SID"),
        userList: [],
        userSelectedName: `${userobj.firstName} ${userobj.lastName}`,
      };
    } else {
      this.state = {
        selectedUser: undefined,
        SID : null,
        userList: [],
        userSelectedName : '',
      };
    }
    this.renderSelectOptions = this.renderSelectOptions.bind(this);
    document.title = "The All Store";

    configP
      .then(config => {
        if (config.user.list) this.setState({ userList: config.user.list });
      })
      .catch(err => {
        this.setState({ error: `Failed to initialize session: ${(err && err.message) || err}`});
      });
  }

  renderSelectOptions(eventKey : any) {
    console.log("eventKey", eventKey);
    let SID = uuidv4();
    if (eventKey === "anonymous") {
      this.setState({ userSelectedName: "anonymous" });
      this.setState({ selectedUser: undefined });
      this.setState({ SID: null });
      localStorage.removeItem("user");
      localStorage.removeItem("SID");
    } else {
      this.setState({
        userSelectedName:
          `${this.state.userList[eventKey].firstName} ${this.state.userList[eventKey].lastName}`,
      });
      this.setState({ selectedUser: this.state.userList[eventKey] });
      this.setState({ SID: SID });
      localStorage.setItem("user", JSON.stringify(this.state.userList[eventKey]));
      localStorage.setItem("SID", SID);
    }
  }

  render() {
    return (
      <div className="App container">

        <Navbar collapseOnSelect className="row">
          <Navbar.Header>
              <Navbar.Brand>
                <a className="navbar-brand-link" href='/'>
                  <div className="brand-img"><img
                    alt=""
                    src="../img/shop-squid.svg"
                    width="50"
                    height="50"
                    className="d-inline-block align-top"
                  /></div>
                  <div className="brand-text">
                    <span className="brand-name">The All Store</span>
                    <span className="brand-tagline">Great Prices, Huge Collection!</span>
                  </div>
                </a>
              </Navbar.Brand>
              <Navbar.Toggle />
            </Navbar.Header>
          <Navbar.Collapse>
            <Nav className="userstate" pullRight>
              <NavItem className="session-id">
                {`Session ID: ${this.state.SID}`}
              </NavItem>
              <NavDropdown
                className="login-dropdown"
                title={"Log In As: " + this.state.userSelectedName}
                id="basic-nav-dropdown"
                onSelect={this.renderSelectOptions}
              >
                {this.state.userList.map((item, key) =>
                  <MenuItem id={`user${key}`} eventKey={key}
                    >{item.firstName + " " + item.lastName}</MenuItem>
                )}
                <MenuItem id="anonymous" eventKey="anonymous">anonymous</MenuItem>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        {
          this.state.error ?
            (
              <div className="row">
                <Alert bsStyle="danger">
                  <i className="glyphicon glyphicon-exclamation-sign"></i>{" "}
                  {this.state.error}
                </Alert>
              </div>
            )
            : ""
        }
        <Router>
            <Switch>
              <Route exact path="/">
                <div className="row">
                  <SearchBar
                    userId={this.state.selectedUser?.id}
                    searchid={undefined}>
                  </SearchBar>
                </div>
                <div className="row">
                  <RecommendationList
                    mode="Normal"
                    userId={this.state.selectedUser?.id}>
                  </RecommendationList>
                </div>
              </Route>
              <Route path="/product/:id">
                <div className="row">
                  <SearchBar
                    userId={this.state.selectedUser?.id}
                    searchid={undefined}>
                  </SearchBar>
                </div>
                <div className="row">
                  <ProductDetail
                    uid={this.state.selectedUser?.id}
                    id={"2"}
                  ></ProductDetail>
                </div>
              </Route>
              <Route exact path="/search/:searchid">
                <div className="row">
                  <SearchBar
                    userId={this.state.selectedUser?.id}
                    searchid={undefined}
                  ></SearchBar>
                </div>
                <div className="row">
                  <RecommendationList
                    mode="Normal"
                    userId={this.state.selectedUser?.id}
                  ></RecommendationList>
                </div>
              </Route>
              <Route path="*" component={notFound} />
            </Switch>
        </Router>

        <div className="row attribution-row">
          <div className="col-xs-12">
            <hr/>
            <p>This demo is based on minimally pre-processed (to reduce size) per-category Amazon.com product review data as used in:</p>
            <p className="citation">
              <span style={{ fontWeight: "bold" }}>"Justifying recommendations using distantly-labeled reviews and fined-grained aspects"</span>
              <br/>Jianmo Ni, Jiacheng Li, Julian McAuley
              <br/>Empirical Methods in Natural Language Processing (EMNLP), 2019
              <br/>
            </p>
            <p>...and published <a href="https://nijianmo.github.io/amazon/index.html">online here</a>.</p>
          </div>
        </div>
      </div>);
  }
}

export default withRouter(App as any);
