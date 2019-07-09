m4_include(`server_base.m4')m4_dnl

install_new_xz_utils

RUN chown_mb(`/home/musicbrainz/log') && \
    chown_mb(`/home/musicbrainz/search-indexes-dumps')

copy_common_mbs_files

COPY \
    docker/musicbrainz-search-indexes-dump/consul-template-search-indexes-dump.conf \
    /etc/

COPY \
    docker/musicbrainz-search-indexes-dump/consul-template.service \
    /etc/service/consul-template/run
RUN chmod 755 /etc/service/consul-template/run

COPY docker/musicbrainz-search-indexes-dump/crontab /var/spool/cron/crontabs/musicbrainz

RUN chown musicbrainz:musicbrainz /var/spool/cron/crontabs/musicbrainz && \
    chmod 600 /var/spool/cron/crontabs/musicbrainz

COPY docker/scripts/start_musicbrainz_server.sh /usr/local/bin/

copy_mb(`docker/templates/DBDefs.pm.ctmpl lib/')

git_info
