NAME=browserid_couchdb
COUCHDB_VERSION=$(shell couch-config --couch-version | sed 's/\+.*//')
PLUGIN_DIRS=ebin priv
PLUGIN_DEST=$(shell couch-config --erl-libs-dir)/$(NAME)
CONFIG_FILES=etc/couchdb/default.d/*.ini 
ERL_COMPILER_OPTIONS="[{i, \"$(shell couch-config --erl-libs-dir)/couch-$(COUCHDB_VERSION)/include\"}]"
all: compile

compile:
	@ERL_LIBS=$(shell couch-config --erl-libs-dir):$(ERL_LIBS) rebar compile

dev:
	@ERL_LIBS=$(shell pwd) couchdb -i -a $(CONFIG_FILES)

install: compile
	@mkdir -p $(PLUGIN_DEST)
	@cp -r $(PLUGIN_DIRS) $(PLUGIN_DEST)/
	@cp $(CONFIG_FILES) $(shell couch-config --config-dir)/default.d/

clean:
	@rm -rf ebin