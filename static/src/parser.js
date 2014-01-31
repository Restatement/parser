/** @jsx React.DOM */

var ParserInterface = React.createClass({
    // TODO: Factor away "tree" into just "input" or something.
    // Input won't just be a text_blob, though. Want information about boldness, headers, etc...
    getInitialState: function() {
        return {
            // 'text_container': <TextContainer parser={this.props.parser}/>,
            'view': 'input',
            'sidebar': <Sidebar parser={this}/>,
            'tree': [],
            'parser_output': {},
            'peg': [
                {
                    node_type: 'js',
                    content: [
                        "var d = {};",
                        "",
                        "function make_new_node(item) {",
                        "    return {",
                        "    title: item",
                        "    };",
                        "}",
                        "",
                        "d[0] = make_new_node('<root node>')",
                        "",
                        "function add_to_index(lvl, item) {",
                        "    var new_node = make_new_node(item.title);",
                        "    if (item.index) new_node['index']=item.index;",
                        "    for (var idx = lvl-1; idx > -1; idx--) {",
                        "         if (d[idx] !== undefined) {",
                        "             if(d[idx].children === undefined) d[idx].children = [];",
                        "             d[idx].children.push(new_node);",
                        "             break;",
                        "         }",
                        "    }",
                        "    d[lvl] = new_node;",
                        "}"].join("\n")
                },
                {
                    node_type: 'rule',
                    content: [
                        'body', ['lines* {return d[0];}']
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'heading', ["h:\"#\"+ i:index? t:text newlines {var o = {\"title\": t, indentation_depth:h.length}; if (i) {o['index']=i;} add_to_index(o.indentation_depth, o); return o;}"]
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'whitespace', ['" "+']
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'index', ["whitespace i:[0-9.]+ whitespace {return i.join('') }"]
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'lines', [
                            "h: heading newlines {return h; }", "t:text newlines {return {}; }"
                        ]
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'newlines', ['"\\n"* {return \'\';}']
                    ]
                },
                {
                    node_type: 'rule',
                    content: [
                        'text', ['chars:[^\\n]+ {return chars.join(\'\').trim(); }']
                    ]
                },
            ]
        };
    },
    load_text: function(text) {
        this.setState({
            tree: [
                {
                    node_type: "text_blob",
                    contents: text
                }
            ]
        });
    },
    set_view: function(view) {
        this.setState({'view': view})
    },
    componentWillUnmount: function() {
        $(this.getDOMNode()).off('parse');
    },
    get_peg_string: function() {
        return this.state.peg.map(function(peg_rule) {
            if (peg_rule.node_type === 'js') {
                return "{\n" + peg_rule.content + "\n}";
            }
            else if (peg_rule.node_type === 'rule') {
                return "\n" + peg_rule.content[0] + "=" + peg_rule.content[1].join(" /\n");
            }
        }).join("\n\n");
    },
    componentDidMount: function() {
        $(this.getDOMNode()).on('parse', function() {
            var parser = PEG.buildParser(this.get_peg_string());
            this.setState({
                parser_output: parser.parse(this.get_input_string())
            });
        }.bind(this));
        $.get('/static/docs/perferred stock agreement.md', function(result) {
            // console.log(result);
            this.load_text(result);

        }.bind(this));
    },
    get_input_string: function() {
        return this.state.tree.map(function(node) {
                switch(node.node_type) {
                    case 'text_blob':
                        return node.contents
                    break;
                }
            }).join("");
    },
    // These get_{input,output}_tree functions sound like they're accessors, but really
    // they output react nodes. TODO: name them better.
    get_input_tree: function() {
        return this.state.tree.map(function(node) {
                switch(node.node_type) {
                    case 'text_blob':
                        return <div className="text_blob">
                            {node.contents.split("\n").map(function(line) {return <div>{line}</div>;})}
                        </div>;
                    break;
                }
            });
    },
    get_output_tree: function() {
        // function proc_parser_node() {
        //     return 
        // }
        // return this.state.parser_output.map(function())
    },
    render_tree: function() {
        if (this.state.view === 'input') {
            return this.get_input_tree();
        }
        else if (this.state.view === 'output') {
            return <TreeNode node={this.state.parser_output}/>;
        }
    },
    render: function() {
        return <div className="row">
        <div className="col-md-9">
            {this.render_tree()}
        </div>
        <div className="col-md-3">
            {this.state.sidebar}
        </div>
        </div>;
    }
});

var TreeNode = React.createClass({
    getInitialState: function() {
        return {
            collapsed: false
        };
    },
    toggle_collapse: function() {
        this.setState({
            collapsed: !this.state.collapsed
        });
    },
    render: function() {
        console.log(this.props);
        var attributes = _.keys(this.props.node)
            .filter(function(x){return x!=='children'})
            .map(function(prop) {
                return <span><span className="node-attr-key">{prop}</span> 
                = <span className="node-attr-val">{this.props.node[prop]}</span></span>
            }.bind(this));
        var children = null;
        var collapse_button = null;
        if (this.props.node.children) {
            children = this.props.node.children.map(function(node) {
                    return <TreeNode node={node}/>;
                });
            children = <div className="node-children">{children}</div>;
            var collapse_btn_class_str = "glyphicon glyphicon-";
            collapse_btn_class_str += this.state.collapsed ? 'plus' : 'minus';
            collapse_button = <button onClick={this.toggle_collapse} className="btn btn-xs btn-default">
                <span className={collapse_btn_class_str}></span>
            </button>;
        }

        return <div>
            <div className="node-attributes">
                {collapse_button}
                {attributes}
            </div>
                {(children && !this.state.collapsed) ? children : ''}
        </div>;
    }
});

var Sidebar = React.createClass({
    getInitialState: function() {
        return {
        };
    },
    do_parse: function() {
        $(this.getDOMNode()).trigger('parse');
    },
    save_parse_output: function() {
        saveAs(
            new Blob([JSON.stringify(this.props.parser.state.parser_output)],
                {type: "text/json;charset=utf-8"}), 
            'parsed.json');
    },
    render: function() {
        var button_classes = function (active_if) {
            var class_str = "btn btn-default";
            if (active_if === this.props.parser.state.view) class_str+='active';
            return class_str
        }.bind(this);
        return <div className="sidebar-panel">
            <button 
                className="btn btn-primary" 
                onClick={this.do_parse}>
                Parse
            </button>
            <button 
                className="btn btn-default" 
                onClick={this.save_parse_output}>
                Save output
            </button>
            <h3>PEG</h3>
            <textarea className="parse-rules">
                {this.props.parser.get_peg_string()}
            </textarea>
            <div>
                View:
                <div className="btn-group">
                  <button type="button" 
                    onClick={function(){this.props.parser.set_view('input')}.bind(this)}
                    className={button_classes('input')}>
                    Input</button>
                  <button type="button" 
                    onClick={function(){this.props.parser.set_view('output')}.bind(this)}
                    className={button_classes('output')}>
                    Output</button>
                </div>
            </div>
        </div>;
    }
});

React.renderComponent(
  <ParserInterface/>,
  $('#main_container').get(0)
);